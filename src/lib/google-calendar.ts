import { google } from 'googleapis';
import { query } from '@/lib/postgres';

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
  try {
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
        const { data: currentCalendar } = await calendar.calendars.get({ calendarId: currentCalendarId });
        // Check if calendar exists AND has the correct name for current environment
        if (currentCalendar.summary === expectedCalendarName) {
          return {
            calendarId: currentCalendarId,
            exists: true,
            created: false,
          };
        } else {
          console.info(
            `Calendar ${currentCalendarId} exists but has wrong name "${currentCalendar.summary}", expected "${expectedCalendarName}". Will search for or create correct calendar.`,
          );
        }
      } catch {
        // Calendar not found or inaccessible, will search/create new one
        console.info(
          `Calendar ${currentCalendarId} not accessible, will search for or create ${expectedCalendarName} calendar`,
        );
      }
    }

    // Search for existing calendar
    const { data: calendars } = await calendar.calendarList.list();
    let calbrewCalendar = calendars.items?.find((c) => c.summary === expectedCalendarName);

    let created = false;
    if (!calbrewCalendar) {
      // Create new calendar
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: expectedCalendarName,
          description: `Hebrew calendar events managed by ${expectedCalendarName}`,
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
