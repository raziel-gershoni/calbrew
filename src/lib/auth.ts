import { NextAuthOptions, User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { google, calendar_v3 } from 'googleapis';
import db from '@/lib/db';
import { HDate } from '@hebcal/core';

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable');
}

function calculateSyncWindow(event_start_year: number): {
  start: number;
  end: number;
} {
  const current_year = new HDate().getFullYear();

  if (event_start_year < current_year - 10) {
    // Scenario 1: Event in the Distant Past
    return { start: current_year - 10, end: current_year + 10 };
  } else if (event_start_year <= current_year) {
    // Scenario 2: Event in the Recent Past
    return { start: event_start_year, end: current_year + 10 };
  } else {
    // Scenario 3: Event in the Future
    return { start: event_start_year, end: event_start_year + 10 };
  }
}

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
  last_synced_hebrew_year: number | null;
  created_at: string;
  updated_at: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.access_token) {
        return false;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({ access_token: account.access_token });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const { data: calendars } = await calendar.calendarList.list();
      let calbrewCalendar = calendars.items?.find(
        (c) => c.summary === 'Calbrew',
      );

      if (!calbrewCalendar) {
        const { data: newCalendar } = await calendar.calendars.insert({
          requestBody: {
            summary: 'Calbrew',
          },
        });
        calbrewCalendar = newCalendar;
      }

      if (!calbrewCalendar?.id) {
        console.error('Could not find or create Calbrew calendar');
        return false;
      }

      const userInDb = await new Promise<User | undefined>(
        (resolve, reject) => {
          db.get('SELECT * FROM users WHERE id = ?', [user.id], (err, row) => {
            if (err) reject(err);
            resolve(row as User | undefined);
          });
        },
      );

      if (!userInDb) {
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO users (id, name, email, image, calbrew_calendar_id) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.name, user.email, user.image, calbrewCalendar.id],
            (err) => {
              if (err) reject(err);
              resolve();
            },
          );
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE users SET calbrew_calendar_id = ? WHERE id = ?',
            [calbrewCalendar.id, user.id],
            (err) => {
              if (err) reject(err);
              resolve();
            },
          );
        });
      }

      // On-demand sync
      const eventsToSync = await new Promise<Event[]>((resolve, reject) => {
        db.all(
          'SELECT * FROM events WHERE user_id = ?',
          [user.id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows as Event[]);
          },
        );
      });

      for (const event of eventsToSync) {
        if (event.last_synced_hebrew_year) {
          const syncWindow = calculateSyncWindow(event.hebrew_year);
          if (event.last_synced_hebrew_year < syncWindow.end) {
            const yearsToSync = Array.from(
              { length: syncWindow.end - event.last_synced_hebrew_year },
              (_, i) => event.last_synced_hebrew_year! + 1 + i,
            );

            for (const year of yearsToSync) {
              const anniversary = year - event.hebrew_year;
              const eventTitle =
                anniversary > 0
                  ? `(${anniversary}) ${event.title}`
                  : event.title;

              const gregorianDate = new HDate(
                event.hebrew_day,
                event.hebrew_month,
                year,
              ).greg();
              const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;

              const calendarEvent: calendar_v3.Schema$Event = {
                summary: eventTitle,
                start: {
                  date: dateString,
                },
                end: {
                  date: dateString,
                },
                extendedProperties: {
                  private: {
                    calbrew_event_id: event.id,
                  },
                },
              };

              if (event.description) {
                calendarEvent.description = event.description;
              }

              try {
                const createdEvent = await calendar.events.insert({
                  calendarId: calbrewCalendar.id!,
                  requestBody: calendarEvent,
                });

                await new Promise<void>((resolve, reject) => {
                  db.run(
                    'INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id) VALUES (?, ?, ?, ?)',
                    [
                      crypto.randomUUID(),
                      event.id,
                      dateString,
                      createdEvent.data.id!,
                    ],
                    (err) => {
                      if (err) reject(err);
                      resolve();
                    },
                  );
                });
              } catch (error) {
                console.error(
                  `Failed to create event for year ${year}:`,
                  error,
                );
              }
            }

            await new Promise<void>((resolve, reject) => {
              db.run(
                'UPDATE events SET last_synced_hebrew_year = ? WHERE id = ?',
                [syncWindow.end, event.id],
                (err) => {
                  if (err) reject(err);
                  resolve();
                },
              );
            });
          }
        }
      }

      return true;
    },
    async jwt({ token, account, user }) {
      // Initial sign-in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.id = user.id;

        const userFromDb = await new Promise<
          { calbrew_calendar_id: string } | undefined
        >((resolve, reject) => {
          db.get(
            'SELECT calbrew_calendar_id FROM users WHERE id = ?',
            [user.id],
            (err, row: { calbrew_calendar_id: string }) => {
              if (err) reject(err);
              else resolve(row);
            },
          );
        });
        token.calbrew_calendar_id = userFromDb?.calbrew_calendar_id;
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired, try to update it
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
            refresh_token: token.refreshToken!,
          }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          throw refreshedTokens;
        }

        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
      } catch (error) {
        console.error('Error refreshing access token', error);
        // The user will be signed out on the client if the session is invalid
        return { ...token, error: 'RefreshAccessTokenError' as const };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id as string;
      session.user.calbrew_calendar_id = token.calbrew_calendar_id as string;
      return session;
    },
  },
};
