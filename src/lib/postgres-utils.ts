import { query, transaction } from './postgres';
import { DatabaseEvent } from './validation';
import { PoolClient } from 'pg';

// Database interfaces
interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  calbrew_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EventOccurrence {
  id: string;
  event_id: string;
  gregorian_date: string;
  google_event_id: string;
  created_at: string;
}

// User operations
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [
    userId,
  ]);
  return result.rows[0] || null;
}

export async function getCurrentCalendarId(
  userId: string,
): Promise<string | null> {
  const result = await query<{ calbrew_calendar_id: string | null }>(
    'SELECT calbrew_calendar_id FROM users WHERE id = $1',
    [userId],
  );
  return result.rows[0]?.calbrew_calendar_id || null;
}

export async function updateUserCalendarId(
  userId: string,
  calendarId: string,
): Promise<void> {
  const result = await query(
    'UPDATE users SET calbrew_calendar_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [calendarId, userId],
  );

  if (result.rowCount === 0) {
    throw new Error('User not found when updating calendar ID');
  }
}

// Event operations
export async function getEventsByUserId(
  userId: string,
): Promise<DatabaseEvent[]> {
  const result = await query<DatabaseEvent>(
    'SELECT * FROM events WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return result.rows;
}

export async function getEventById(
  eventId: string,
  userId: string,
): Promise<DatabaseEvent | null> {
  const result = await query<DatabaseEvent>(
    'SELECT * FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );
  return result.rows[0] || null;
}

export async function createEvent(event: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
  last_synced_hebrew_year: number | null;
}): Promise<void> {
  await query(
    `INSERT INTO events (
      id, user_id, title, description, hebrew_year, hebrew_month, 
      hebrew_day, recurrence_rule, last_synced_hebrew_year
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      event.id,
      event.user_id,
      event.title,
      event.description,
      event.hebrew_year,
      event.hebrew_month,
      event.hebrew_day,
      event.recurrence_rule,
      event.last_synced_hebrew_year,
    ],
  );
}

export async function updateEvent(event: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
}): Promise<void> {
  const result = await query(
    `UPDATE events SET 
      title = $1, description = $2, hebrew_year = $3, hebrew_month = $4, 
      hebrew_day = $5, recurrence_rule = $6, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $7 AND user_id = $8`,
    [
      event.title,
      event.description,
      event.hebrew_year,
      event.hebrew_month,
      event.hebrew_day,
      event.recurrence_rule,
      event.id,
      event.user_id,
    ],
  );

  if (result.rowCount === 0) {
    throw new Error('Event not found or access denied');
  }
}

export async function deleteEvent(
  eventId: string,
  userId: string,
): Promise<void> {
  const result = await query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2',
    [eventId, userId],
  );

  if (result.rowCount === 0) {
    throw new Error('Event not found or access denied');
  }
}

// Event occurrence operations
export async function createEventOccurrence(occurrence: {
  id: string;
  event_id: string;
  gregorian_date: string;
  google_event_id: string;
}): Promise<void> {
  await query(
    'INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id) VALUES ($1, $2, $3, $4)',
    [
      occurrence.id,
      occurrence.event_id,
      occurrence.gregorian_date,
      occurrence.google_event_id,
    ],
  );
}

export async function getEventOccurrencesByEventId(
  eventId: string,
): Promise<EventOccurrence[]> {
  const result = await query<EventOccurrence>(
    'SELECT * FROM event_occurrences WHERE event_id = $1 ORDER BY gregorian_date',
    [eventId],
  );
  return result.rows;
}

export async function deleteEventOccurrencesByEventId(
  eventId: string,
): Promise<void> {
  await query('DELETE FROM event_occurrences WHERE event_id = $1', [eventId]);
}

// Batch operations for better performance
export async function createEventOccurrencesBatch(
  occurrences: Array<{
    id: string;
    event_id: string;
    gregorian_date: string;
    google_event_id: string;
  }>,
): Promise<void> {
  if (occurrences.length === 0) {
    return;
  }

  await transaction(async (client: PoolClient) => {
    const values: unknown[] = [];
    const placeholders: string[] = [];

    occurrences.forEach((occurrence, index) => {
      const offset = index * 4;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`,
      );
      values.push(
        occurrence.id,
        occurrence.event_id,
        occurrence.gregorian_date,
        occurrence.google_event_id,
      );
    });

    await client.query(
      `INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
  });
}

// Language preference operations
export async function getUserLanguage(userId: string): Promise<string> {
  const result = await query<{ language: string }>(
    'SELECT language FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new Error('User not found when getting language');
  }

  return result.rows[0].language || 'en';
}

export async function updateUserLanguage(
  userId: string,
  language: string,
): Promise<void> {
  const result = await query(
    'UPDATE users SET language = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [language, userId],
  );

  if (result.rowCount === 0) {
    throw new Error('User not found when updating language');
  }
}

// Calendar mode preference operations
export async function getUserCalendarMode(userId: string): Promise<string> {
  const result = await query<{ calendar_mode: string }>(
    'SELECT calendar_mode FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new Error('User not found when getting calendar mode');
  }

  return result.rows[0].calendar_mode || 'hebrew';
}

export async function updateUserCalendarMode(
  userId: string,
  calendarMode: string,
): Promise<void> {
  const result = await query(
    'UPDATE users SET calendar_mode = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [calendarMode, userId],
  );

  if (result.rowCount === 0) {
    throw new Error('User not found when updating calendar mode');
  }
}

// Google Calendar sync operations
export async function getUserGcalSyncEnabled(userId: string): Promise<boolean> {
  const result = await query<{ gcal_sync_enabled: boolean }>(
    'SELECT gcal_sync_enabled FROM users WHERE id = $1',
    [userId],
  );
  return result.rows[0]?.gcal_sync_enabled || false;
}

export async function updateUserGcalSyncEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await query('UPDATE users SET gcal_sync_enabled = $1 WHERE id = $2', [
    enabled,
    userId,
  ]);
}

export async function isEventSynced(eventId: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM event_occurrences WHERE event_id = $1',
    [eventId],
  );
  return parseInt(result.rows[0]?.count || '0') > 0;
}

export async function getEventsSyncStatus(
  eventIds: string[],
): Promise<Map<string, boolean>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const placeholders = eventIds.map((_, index) => `$${index + 1}`).join(',');
  const result = await query<{ event_id: string; count: string }>(
    `SELECT event_id, COUNT(*) as count 
     FROM event_occurrences 
     WHERE event_id IN (${placeholders}) 
     GROUP BY event_id`,
    eventIds,
  );

  const syncStatus = new Map<string, boolean>();
  // Initialize all events as not synced
  eventIds.forEach((id) => syncStatus.set(id, false));
  // Mark synced events as true
  result.rows.forEach((row) => {
    if (parseInt(row.count) > 0) {
      syncStatus.set(row.event_id, true);
    }
  });

  return syncStatus;
}
