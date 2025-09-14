import { google } from 'googleapis';
import { query } from '@/lib/postgres';

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
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // First, check if the current calendar ID exists (if provided)
    if (currentCalendarId) {
      try {
        await calendar.calendars.get({ calendarId: currentCalendarId });
        // Calendar exists, return it
        return {
          calendarId: currentCalendarId,
          exists: true,
          created: false,
        };
      } catch {
        // Calendar not found or inaccessible, will search/create new one
        console.info(
          `Calendar ${currentCalendarId} not accessible, will search for or create Calbrew calendar`,
        );
      }
    }

    // Search for existing Calbrew calendar
    const { data: calendars } = await calendar.calendarList.list();
    let calbrewCalendar = calendars.items?.find((c) => c.summary === 'Calbrew');

    let created = false;
    if (!calbrewCalendar) {
      // Create new calendar
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: 'Calbrew',
          description: 'Hebrew calendar events managed by Calbrew',
        },
      });
      calbrewCalendar = newCalendar;
      created = true;
    }

    const calendarId = calbrewCalendar?.id;

    if (!calendarId) {
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
      } catch (dbError) {
        console.error(
          'Failed to update user calendar ID in database:',
          dbError,
        );
        // Don't fail the operation for database update issues
      }
    }

    return {
      calendarId,
      exists: !created,
      created,
    };
  } catch (error) {
    console.error('Failed to ensure calendar exists:', error);
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
