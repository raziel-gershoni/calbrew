import { google } from 'googleapis';
import { query } from '@/lib/postgres';
import { componentLoggers } from '@/lib/logger';
import * as SentryHelper from '@/lib/logger/sentry';

const logger = componentLoggers.googleApi;

// Get environment-specific calendar name
const getCalendarName = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'Calbrew-Dev' : 'Calbrew';
};

export interface CalendarCheckResult {
  calendarId: string | null;
  exists: boolean;
  created: boolean;
  error?: string;
}

/**
 * Ensures that the Calbrew calendar exists in Google Calendar.
 * If it doesn't exist, attempts to create it.
 * Updates the user's record with the calendar ID.
 */
export async function ensureCalendarExists(
  accessToken: string,
  userId: string,
  currentCalendarId?: string,
): Promise<CalendarCheckResult> {
  const startTime = Date.now();
  try {
    logger.info({ userId, currentCalendarId }, 'Ensuring calendar exists');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // First, check if the current calendar ID exists and has the right name (if provided)
    const expectedCalendarName = getCalendarName();
    if (currentCalendarId) {
      try {
        const { data: currentCalendar } = await calendar.calendars.get({
          calendarId: currentCalendarId,
        });
        // Check if calendar exists AND has the correct name for current environment
        if (currentCalendar.summary === expectedCalendarName) {
          logger.info(
            {
              userId,
              calendarId: currentCalendarId,
              durationMs: Date.now() - startTime,
            },
            'Calendar already exists with correct name',
          );
          return {
            calendarId: currentCalendarId,
            exists: true,
            created: false,
          };
        } else {
          logger.info(
            {
              userId,
              calendarId: currentCalendarId,
              currentName: currentCalendar.summary,
              expectedName: expectedCalendarName,
            },
            'Calendar exists but has wrong name, will search for correct one',
          );
        }
      } catch {
        // Calendar not found or inaccessible, will search/create new one
        logger.info(
          {
            userId,
            calendarId: currentCalendarId,
            expectedName: expectedCalendarName,
          },
          'Calendar not accessible, will search or create',
        );
      }
    }

    // Search for existing calendar
    const { data: calendars } = await calendar.calendarList.list();
    let calbrewCalendar = calendars.items?.find(
      (c) => c.summary === expectedCalendarName,
    );

    let created = false;
    if (!calbrewCalendar) {
      // Create new calendar
      logger.info(
        { userId, calendarName: expectedCalendarName },
        'Creating new calendar',
      );
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: expectedCalendarName,
          description: `Hebrew calendar events managed by ${expectedCalendarName}`,
        },
      });
      calbrewCalendar = newCalendar;
      created = true;
      logger.info(
        {
          userId,
          calendarId: newCalendar?.id,
          calendarName: expectedCalendarName,
        },
        'Successfully created new calendar',
      );
    }

    const calendarId = calbrewCalendar?.id;

    if (!calendarId) {
      logger.error({ userId }, 'Failed to get calendar ID from response');
      return {
        calendarId: null,
        exists: false,
        created: false,
        error: 'Failed to get calendar ID',
      };
    }

    // Update user's calendar ID in database if it changed
    if (calendarId !== currentCalendarId) {
      try {
        await query('UPDATE users SET calbrew_calendar_id = $1 WHERE id = $2', [
          calendarId,
          userId,
        ]);
        logger.info(
          { userId, calendarId },
          'Updated user calendar ID in database',
        );
      } catch (dbError) {
        logger.error(
          { userId, calendarId, error: dbError },
          'Failed to update user calendar ID in database',
        );
        // Don't fail the operation for database update issues
      }
    }

    logger.info(
      { userId, calendarId, created, durationMs: Date.now() - startTime },
      'Successfully ensured calendar exists',
    );
    return {
      calendarId,
      exists: !created,
      created,
    };
  } catch (error) {
    logger.error(
      { userId, error, durationMs: Date.now() - startTime },
      'Failed to ensure calendar exists',
    );
    SentryHelper.captureException(error, {
      tags: { operation: 'ensure-calendar-exists', userId },
      level: 'error',
    });
    return {
      calendarId: null,
      exists: false,
      created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks if a calendar exists without trying to create it
 */
export async function checkCalendarExists(
  accessToken: string,
  calendarId: string,
): Promise<boolean> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.calendars.get({ calendarId });
    return true;
  } catch {
    return false;
  }
}
