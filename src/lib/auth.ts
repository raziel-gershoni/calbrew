import { NextAuthOptions, User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { google } from 'googleapis';
import db from '@/lib/db';

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable');
}

// Helper function to handle database operations with proper error handling
function dbGet<T>(sql: string, params: unknown[]): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database error in dbGet:', err);
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
}

function dbRun(sql: string, params: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        console.error('Database error in dbRun:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Helper function to safely create or find Calbrew calendar
async function ensureCalbrewCalendar(
  accessToken: string,
): Promise<string | null> {
  try {
    console.log('🔑 Setting up OAuth client for calendar access');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('📅 Attempting to list calendars...');
    const { data: calendars } = await calendar.calendarList.list();
    console.log(
      `✅ Successfully listed ${calendars.items?.length || 0} calendars`,
    );

    let calbrewCalendar = calendars.items?.find((c) => c.summary === 'Calbrew');

    if (!calbrewCalendar) {
      console.log('📝 Calbrew calendar not found, creating new one...');
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: 'Calbrew',
          description: 'Hebrew calendar events managed by Calbrew',
        },
      });
      calbrewCalendar = newCalendar;
      console.log(`✅ Created new Calbrew calendar: ${newCalendar?.id}`);
    } else {
      console.log(`✅ Found existing Calbrew calendar: ${calbrewCalendar.id}`);
    }

    return calbrewCalendar?.id || null;
  } catch (error: unknown) {
    const errorObj = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('❌ Failed to create/find Calbrew calendar:');
    console.error('Error details:', {
      message: errorObj.message,
      status: errorObj.status || errorObj.code,
      statusText: errorObj.statusText,
      response: errorObj.response?.data,
    });

    // Log specific error for insufficient scopes
    if (errorObj.code === 403 || errorObj.status === 403) {
      console.error('🚫 This appears to be a permissions/scope issue.');
      console.error(
        'Required scopes: https://www.googleapis.com/auth/calendar',
      );
    }

    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.access_token) {
        console.error('No access token received from Google');
        return false;
      }

      try {
        console.log('🔐 Starting sign-in process for user:', user.id);

        // Check if user exists
        const userInDb = await dbGet<User>('SELECT * FROM users WHERE id = ?', [
          user.id,
        ]);

        if (!userInDb) {
          console.log('👤 Creating new user in database');
          // Create new user without calendar ID initially
          await dbRun(
            'INSERT INTO users (id, name, email, image, calbrew_calendar_id) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.name, user.email, user.image, null],
          );
        } else {
          console.log('👤 Updating existing user information');
          // Update existing user info (don't overwrite calendar ID if it exists)
          await dbRun(
            'UPDATE users SET name = ?, email = ?, image = ? WHERE id = ?',
            [user.name, user.email, user.image, user.id],
          );
        }

        // Try to create/find calendar, but don't fail sign-in if it doesn't work
        console.log('📅 Attempting to set up calendar (non-blocking)');
        try {
          const calendarId = await ensureCalbrewCalendar(account.access_token);
          if (calendarId) {
            console.log('✅ Calendar setup successful, updating user record');
            await dbRun(
              'UPDATE users SET calbrew_calendar_id = ? WHERE id = ?',
              [calendarId, user.id],
            );
          } else {
            console.warn(
              '⚠️ Calendar setup failed, but continuing with sign-in',
            );
          }
        } catch (calendarError) {
          console.warn(
            '⚠️ Calendar setup failed during sign-in:',
            calendarError,
          );
          console.warn(
            '📝 User can still sign in - calendar will be set up on first use',
          );
        }

        console.log('✅ Sign-in process completed successfully');
        return true;
      } catch (error) {
        console.error('❌ Error during sign in:', error);
        return false;
      }
    },
    async jwt({ token, account, user, trigger }) {
      // Initial sign-in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.id = user.id;

        try {
          const userFromDb = await dbGet<{ calbrew_calendar_id: string }>(
            'SELECT calbrew_calendar_id FROM users WHERE id = ?',
            [user.id],
          );
          token.calbrew_calendar_id = userFromDb?.calbrew_calendar_id;
        } catch (error) {
          console.error('Failed to fetch user calendar ID:', error);
          // Continue without calendar ID - will be resolved on next request
        }

        return token;
      }

      // On update trigger (when session is manually updated), refresh calendar ID
      if (trigger === 'update' && token.id) {
        try {
          const userFromDb = await dbGet<{ calbrew_calendar_id: string }>(
            'SELECT calbrew_calendar_id FROM users WHERE id = ?',
            [token.id as string],
          );
          token.calbrew_calendar_id = userFromDb?.calbrew_calendar_id;
        } catch (error) {
          console.error('Failed to refresh calendar ID from database:', error);
        }
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      if (!token.refreshToken) {
        console.error('No refresh token available');
        return { ...token, error: 'RefreshAccessTokenError' as const };
      }

      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
          }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          console.error('Token refresh failed:', refreshedTokens);
          throw refreshedTokens;
        }

        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
      } catch (error) {
        console.error('Error refreshing access token:', error);
        // Add more detailed logging for debugging
        if (error && typeof error === 'object' && 'error' in error) {
          console.error('Google OAuth Error Details:', {
            error: (error as any).error, // eslint-disable-line @typescript-eslint/no-explicit-any
            error_description: (error as any).error_description, // eslint-disable-line @typescript-eslint/no-explicit-any
            userId: token.id,
          });
        }
        // The user will be signed out on the client if the session is invalid
        return { ...token, error: 'RefreshAccessTokenError' as const };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.user.id = token.id as string;
      session.user.calbrew_calendar_id = token.calbrew_calendar_id as string;
      return session;
    },
  },
};
