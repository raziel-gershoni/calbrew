import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { google } from 'googleapis';
import { query } from '@/lib/postgres';
import { componentLoggers } from '@/lib/logger';
import * as SentryHelper from '@/lib/logger/sentry';

const logger = componentLoggers.auth;

// Get environment-specific calendar name
const getCalendarName = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'Calbrew-Dev' : 'Calbrew';
};

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable');
}

// Helper function to safely create or find Calbrew calendar
async function ensureCalbrewCalendar(
  accessToken: string,
): Promise<string | null> {
  try {
    logger.info('Setting up OAuth client for calendar access');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    logger.info('Listing calendars');
    const { data: calendars } = await calendar.calendarList.list();
    logger.info(
      { calendarCount: calendars.items?.length || 0 },
      'Successfully listed calendars',
    );

    const calendarName = getCalendarName();
    let calbrewCalendar = calendars.items?.find(
      (c) => c.summary === calendarName,
    );

    if (!calbrewCalendar) {
      logger.info({ calendarName }, 'Calendar not found, creating new one');
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: calendarName,
          description: `Hebrew calendar events managed by ${calendarName}`,
        },
      });
      calbrewCalendar = newCalendar;
      logger.info(
        { calendarName, calendarId: newCalendar?.id },
        'Created new calendar',
      );
    } else {
      logger.info(
        { calendarName, calendarId: calbrewCalendar.id },
        'Found existing calendar',
      );
    }

    return calbrewCalendar?.id || null;
  } catch (error: unknown) {
    const errorObj = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.error(
      {
        error,
        errorCode: errorObj.status || errorObj.code,
        errorMessage: errorObj.message,
        responseData: errorObj.response?.data,
      },
      'Failed to create/find Calbrew calendar',
    );

    // Log specific error for insufficient scopes
    if (errorObj.code === 403 || errorObj.status === 403) {
      logger.error('Insufficient permissions/scope for calendar access');
      SentryHelper.captureException(error, {
        tags: {
          operation: 'ensure-calendar',
          errorType: 'insufficient_permissions',
        },
        level: 'error',
      });
    } else {
      SentryHelper.captureException(error, {
        tags: { operation: 'ensure-calendar' },
        level: 'error',
      });
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
        logger.error(
          { userId: user.id },
          'No access token received from Google',
        );
        SentryHelper.captureMessage('No access token received from Google', {
          level: 'error',
          tags: { operation: 'signin', userId: user.id },
        });
        return false;
      }

      try {
        logger.info({ userId: user.id }, 'Starting sign-in process');
        SentryHelper.addBreadcrumb({
          message: 'User sign-in started',
          category: 'auth',
          level: 'info',
          data: { userId: user.id },
        });

        // Database initialization and migrations now happen automatically on startup

        // Check if user exists
        const userResult = await query<Record<string, unknown>>(
          'SELECT * FROM users WHERE id = $1',
          [user.id],
        );

        if (!userResult.rows[0]) {
          logger.info({ userId: user.id }, 'Creating new user in database');
          // Create new user without calendar ID initially
          await query(
            'INSERT INTO users (id, name, email, image, calbrew_calendar_id) VALUES ($1, $2, $3, $4, $5)',
            [user.id, user.name, user.email, user.image, null],
          );
        } else {
          logger.info(
            { userId: user.id },
            'Updating existing user information',
          );
          // Update existing user info (don't overwrite calendar ID if it exists)
          await query(
            'UPDATE users SET name = $1, email = $2, image = $3 WHERE id = $4',
            [user.name, user.email, user.image, user.id],
          );
        }

        // Try to create/find calendar, but don't fail sign-in if it doesn't work
        logger.info(
          { userId: user.id },
          'Attempting to set up calendar (non-blocking)',
        );
        try {
          const calendarId = await ensureCalbrewCalendar(account.access_token);
          if (calendarId) {
            logger.info(
              { userId: user.id, calendarId },
              'Calendar setup successful',
            );
            await query(
              'UPDATE users SET calbrew_calendar_id = $1 WHERE id = $2',
              [calendarId, user.id],
            );
          } else {
            logger.warn(
              { userId: user.id },
              'Calendar setup failed, continuing with sign-in',
            );
          }
        } catch (calendarError) {
          logger.warn(
            { userId: user.id, error: calendarError },
            'Calendar setup failed during sign-in - will retry on first use',
          );
        }

        logger.info(
          { userId: user.id },
          'Sign-in process completed successfully',
        );
        SentryHelper.addBreadcrumb({
          message: 'User sign-in completed',
          category: 'auth',
          level: 'info',
          data: { userId: user.id },
        });
        return true;
      } catch (error) {
        logger.error({ userId: user.id, error }, 'Error during sign in');
        SentryHelper.captureException(error, {
          tags: { operation: 'signin', userId: user.id },
          level: 'error',
        });
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

        // Store tokens in database for background service access
        try {
          await query(
            `UPDATE users
             SET access_token = $1,
                 refresh_token = $2,
                 token_expires_at = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
              account.access_token,
              account.refresh_token,
              account.expires_at,
              user.id,
            ],
          );
          logger.info({ userId: user.id }, 'Stored tokens in database');
        } catch (error) {
          logger.error(
            { userId: user.id, error },
            'Failed to store tokens in database',
          );
          SentryHelper.captureException(error, {
            tags: {
              operation: 'jwt-callback',
              step: 'store-tokens',
              userId: user.id,
            },
            level: 'error',
          });
        }

        try {
          const userResult = await query<{ calbrew_calendar_id: string }>(
            'SELECT calbrew_calendar_id FROM users WHERE id = $1',
            [user.id],
          );
          token.calbrew_calendar_id = userResult.rows[0]?.calbrew_calendar_id;
        } catch (error) {
          logger.error(
            { userId: user.id, error },
            'Failed to fetch user calendar ID',
          );
          // Continue without calendar ID - will be resolved on next request
        }

        return token;
      }

      // On update trigger (when session is manually updated), refresh calendar ID
      if (trigger === 'update' && token.id) {
        try {
          const userResult = await query<{ calbrew_calendar_id: string }>(
            'SELECT calbrew_calendar_id FROM users WHERE id = $1',
            [token.id as string],
          );
          token.calbrew_calendar_id = userResult.rows[0]?.calbrew_calendar_id;
        } catch (error) {
          logger.error(
            { userId: token.id, error },
            'Failed to refresh calendar ID from database',
          );
        }
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      if (!token.refreshToken) {
        logger.error(
          { userId: token.id },
          'No refresh token available for token refresh',
        );
        SentryHelper.captureMessage('No refresh token available', {
          level: 'error',
          tags: {
            operation: 'jwt-callback',
            step: 'refresh-token',
            userId: token.id as string,
          },
        });
        return { ...token, error: 'RefreshAccessTokenError' as const };
      }

      try {
        logger.info({ userId: token.id }, 'Attempting to refresh access token');
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
          logger.error(
            {
              userId: token.id,
              status: response.status,
              error: refreshedTokens,
            },
            'Token refresh failed',
          );
          throw refreshedTokens;
        }

        const newToken = {
          ...token,
          accessToken: refreshedTokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };

        logger.info(
          { userId: token.id },
          'Successfully refreshed access token',
        );

        // Update tokens in database for background service
        try {
          await query(
            `UPDATE users
             SET access_token = $1,
                 refresh_token = $2,
                 token_expires_at = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
              newToken.accessToken,
              newToken.refreshToken,
              newToken.expiresAt,
              token.id,
            ],
          );
          logger.info(
            { userId: token.id },
            'Updated refreshed tokens in database',
          );
        } catch (error) {
          logger.error(
            { userId: token.id, error },
            'Failed to update refreshed tokens in database',
          );
          SentryHelper.captureException(error, {
            tags: {
              operation: 'jwt-callback',
              step: 'update-refreshed-tokens',
              userId: token.id as string,
            },
            level: 'error',
          });
        }

        return newToken;
      } catch (error) {
        logger.error(
          { userId: token.id, error },
          'Error refreshing access token',
        );
        // Add more detailed logging for debugging
        if (error && typeof error === 'object' && 'error' in error) {
          logger.error(
            {
              userId: token.id,
              oauthError: (error as any).error, // eslint-disable-line @typescript-eslint/no-explicit-any
              oauthErrorDescription: (error as any).error_description, // eslint-disable-line @typescript-eslint/no-explicit-any
            },
            'Google OAuth error details',
          );
        }
        SentryHelper.captureException(error, {
          tags: {
            operation: 'jwt-callback',
            step: 'refresh-token',
            userId: token.id as string,
          },
          level: 'error',
          extra: error && typeof error === 'object' ? error : {},
        });
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
