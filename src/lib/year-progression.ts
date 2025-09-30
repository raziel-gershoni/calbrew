/**
 * Year Progression Management
 * Handles automatic detection and syncing of events when new Hebrew years arrive
 */

import { HDate } from '@hebcal/core';
import { query } from './postgres';
import { createEventOccurrence, getEventsByUserId } from './postgres-utils';
import { google } from 'googleapis';
import { withGoogleCalendarRetry } from './retry';

export interface YearProgressionStatus {
  eventId: string;
  title: string;
  hebrewYear: number;
  lastSyncedYear: number;
  currentYear: number;
  yearsNeedingSync: number[];
  needsUpdate: boolean;
}

export interface YearProgressionResult {
  totalEvents: number;
  eventsNeedingUpdate: number;
  eventsUpdated: number;
  eventsFailed: number;
  errors: string[];
  updatedEvents: YearProgressionStatus[];
}

/**
 * Check if an event needs year progression updates
 */
export async function checkEventYearProgression(
  eventId: string,
  userId: string,
): Promise<YearProgressionStatus | null> {
  try {
    const result = await query<{
      id: string;
      title: string;
      hebrew_year: number;
      last_synced_hebrew_year: number | null;
    }>(
      `
      SELECT id, title, hebrew_year, last_synced_hebrew_year
      FROM events 
      WHERE id = $1 AND user_id = $2
    `,
      [eventId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const event = result.rows[0];
    const currentYear = new HDate().getFullYear();
    const lastSyncedYear = event.last_synced_hebrew_year || event.hebrew_year;

    // Calculate years that need syncing
    const yearsNeedingSync: number[] = [];
    for (let year = lastSyncedYear + 1; year <= currentYear; year++) {
      yearsNeedingSync.push(year);
    }

    return {
      eventId: event.id,
      title: event.title,
      hebrewYear: event.hebrew_year,
      lastSyncedYear,
      currentYear,
      yearsNeedingSync,
      needsUpdate: yearsNeedingSync.length > 0,
    };
  } catch (error) {
    console.error('Error checking event year progression:', error);
    return null;
  }
}

/**
 * Check all events for a user that need year progression updates
 */
export async function checkUserYearProgression(
  userId: string,
): Promise<YearProgressionStatus[]> {
  try {
    const events = await getEventsByUserId(userId);
    const progressionStatuses: YearProgressionStatus[] = [];

    for (const event of events) {
      const status = await checkEventYearProgression(event.id, userId);
      if (status && status.needsUpdate) {
        progressionStatuses.push(status);
      }
    }

    return progressionStatuses;
  } catch (error) {
    console.error('Error checking user year progression:', error);
    return [];
  }
}

/**
 * Sync new years for a specific event
 */
export async function syncEventNewYears(
  eventId: string,
  userId: string,
  accessToken: string,
  calendarId: string,
): Promise<{ success: boolean; yearsSynced: number[]; error?: string }> {
  try {
    const status = await checkEventYearProgression(eventId, userId);
    if (!status || !status.needsUpdate) {
      return { success: true, yearsSynced: [] };
    }

    // Get event details
    const eventResult = await query<{
      title: string;
      description: string | null;
      hebrew_year: number;
      hebrew_month: number;
      hebrew_day: number;
    }>(
      `
      SELECT title, description, hebrew_year, hebrew_month, hebrew_day
      FROM events 
      WHERE id = $1 AND user_id = $2
    `,
      [eventId, userId],
    );

    if (eventResult.rows.length === 0) {
      return { success: false, yearsSynced: [], error: 'Event not found' };
    }

    const event = eventResult.rows[0];

    // Setup Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const syncedYears: number[] = [];
    const createdOccurrences = [];

    // Create Google Calendar events for new years
    for (const year of status.yearsNeedingSync) {
      const anniversary = year - event.hebrew_year;
      const eventTitle =
        anniversary > 0 ? `(${anniversary}) ${event.title}` : event.title;

      const gregorianDate = new HDate(
        event.hebrew_day,
        event.hebrew_month,
        year,
      ).greg();

      const dateString = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;

      const eventData = {
        summary: eventTitle,
        description: event.description || undefined,
        start: { date: dateString },
        end: { date: dateString },
        extendedProperties: {
          private: { calbrew_event_id: eventId },
        },
      };

      try {
        const createdEvent = await withGoogleCalendarRetry(async () => {
          return await calendar.events.insert({
            calendarId: calendarId,
            requestBody: eventData,
          });
        }, `Create event for year ${year} during year progression`);

        if (createdEvent.data?.id) {
          createdOccurrences.push({
            id: crypto.randomUUID(),
            event_id: eventId,
            gregorian_date: dateString,
            google_event_id: createdEvent.data.id!,
          });
          syncedYears.push(year);
        }
      } catch (error) {
        console.error(`Failed to create event for year ${year}:`, error);
        // Continue with other years even if one fails
      }
    }

    // Batch insert event occurrences
    if (createdOccurrences.length > 0) {
      for (const occurrence of createdOccurrences) {
        await createEventOccurrence(occurrence);
      }

      // Update last_synced_hebrew_year
      const maxSyncedYear = Math.max(...syncedYears);
      await query(
        `
        UPDATE events 
        SET last_synced_hebrew_year = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [maxSyncedYear, eventId],
      );
    }

    return { success: true, yearsSynced: syncedYears };
  } catch (error) {
    console.error('Error syncing event new years:', error);
    return {
      success: false,
      yearsSynced: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process year progression for all events of a user
 */
export async function processUserYearProgression(
  userId: string,
  accessToken: string,
  calendarId: string,
): Promise<YearProgressionResult> {
  const result: YearProgressionResult = {
    totalEvents: 0,
    eventsNeedingUpdate: 0,
    eventsUpdated: 0,
    eventsFailed: 0,
    errors: [],
    updatedEvents: [],
  };

  try {
    const events = await getEventsByUserId(userId);
    result.totalEvents = events.length;

    for (const event of events) {
      const status = await checkEventYearProgression(event.id, userId);

      if (status && status.needsUpdate) {
        result.eventsNeedingUpdate++;

        const syncResult = await syncEventNewYears(
          event.id,
          userId,
          accessToken,
          calendarId,
        );

        if (syncResult.success) {
          result.eventsUpdated++;
          result.updatedEvents.push({
            ...status,
            yearsNeedingSync: syncResult.yearsSynced,
          });
        } else {
          result.eventsFailed++;
          result.errors.push(`${event.title}: ${syncResult.error}`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error processing user year progression:', error);
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error',
    );
    return result;
  }
}

/**
 * Get year progression summary for dashboard
 */
export async function getYearProgressionSummary(userId: string): Promise<{
  totalEvents: number;
  eventsNeedingUpdate: number;
  eventsUpToDate: number;
  lastChecked: Date;
}> {
  try {
    const events = await getEventsByUserId(userId);

    let eventsNeedingUpdate = 0;
    let eventsUpToDate = 0;

    for (const event of events) {
      const status = await checkEventYearProgression(event.id, userId);
      if (status && status.needsUpdate) {
        eventsNeedingUpdate++;
      } else {
        eventsUpToDate++;
      }
    }

    return {
      totalEvents: events.length,
      eventsNeedingUpdate,
      eventsUpToDate,
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('Error getting year progression summary:', error);
    return {
      totalEvents: 0,
      eventsNeedingUpdate: 0,
      eventsUpToDate: 0,
      lastChecked: new Date(),
    };
  }
}
