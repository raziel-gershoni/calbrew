import db from './db';
import { withDatabaseRetry, createDatabaseError } from './retry';
import { DatabaseEvent } from './validation';
import { Statement } from 'sqlite3';

// Database interfaces
interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
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

// Prepared statement cache
const preparedStatements = new Map<string, Statement>();

// Helper function to get or create prepared statement
function getPreparedStatement(key: string, sql: string): Statement {
  if (!preparedStatements.has(key)) {
    const stmt = db.prepare(sql);
    preparedStatements.set(key, stmt);
  }
  const stmt = preparedStatements.get(key);
  if (!stmt) {
    throw new Error(`Failed to get prepared statement: ${key}`);
  }
  return stmt;
}

// User operations with prepared statements
export async function getUserById(userId: string): Promise<User | null> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'getUserById',
      'SELECT * FROM users WHERE id = ?',
    );
    return new Promise<User | null>((resolve, reject) => {
      stmt.get([userId], (err: Error | null, row?: User) => {
        if (err) {
          reject(createDatabaseError('Failed to get user', err));
        } else {
          resolve(row || null);
        }
      });
    });
  }, 'Get user by ID');
}

export async function getCurrentCalendarId(
  userId: string,
): Promise<string | null> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'getCurrentCalendarId',
      'SELECT calbrew_calendar_id FROM users WHERE id = ?',
    );
    return new Promise<string | null>((resolve, reject) => {
      stmt.get(
        [userId],
        (err: Error | null, row?: { calbrew_calendar_id: string | null }) => {
          if (err) {
            reject(createDatabaseError('Failed to get calendar ID', err));
          } else {
            resolve(row?.calbrew_calendar_id || null);
          }
        },
      );
    });
  }, 'Get current calendar ID');
}

export async function updateUserCalendarId(
  userId: string,
  calendarId: string,
): Promise<void> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'updateUserCalendarId',
      'UPDATE users SET calbrew_calendar_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run(
        [calendarId, userId],
        function (this: { changes: number }, err: Error | null) {
          if (err) {
            reject(createDatabaseError('Failed to update calendar ID', err));
          } else if (this.changes === 0) {
            reject(
              createDatabaseError('User not found when updating calendar ID'),
            );
          } else {
            resolve();
          }
        },
      );
    });
  }, 'Update user calendar ID');
}

// Event operations with prepared statements
export async function getEventsByUserId(
  userId: string,
): Promise<DatabaseEvent[]> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'getEventsByUserId',
      'SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC',
    );
    return new Promise<DatabaseEvent[]>((resolve, reject) => {
      stmt.all([userId], (err: Error | null, rows?: DatabaseEvent[]) => {
        if (err) {
          reject(createDatabaseError('Failed to get events', err));
        } else {
          resolve(rows || []);
        }
      });
    });
  }, 'Get events by user ID');
}

export async function getEventById(
  eventId: string,
  userId: string,
): Promise<DatabaseEvent | null> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'getEventById',
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
    );
    return new Promise<DatabaseEvent | null>((resolve, reject) => {
      stmt.get([eventId, userId], (err: Error | null, row?: DatabaseEvent) => {
        if (err) {
          reject(createDatabaseError('Failed to get event', err));
        } else {
          resolve(row || null);
        }
      });
    });
  }, 'Get event by ID');
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
  last_synced_hebrew_year: number;
}): Promise<void> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'createEvent',
      `INSERT INTO events (
        id, user_id, title, description, hebrew_year, hebrew_month, 
        hebrew_day, recurrence_rule, last_synced_hebrew_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run(
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
        function (err: Error | null) {
          if (err) {
            reject(createDatabaseError('Failed to create event', err));
          } else {
            resolve();
          }
        },
      );
    });
  }, 'Create event');
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
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'updateEvent',
      `UPDATE events SET 
        title = ?, description = ?, hebrew_year = ?, hebrew_month = ?, 
        hebrew_day = ?, recurrence_rule = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?`,
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run(
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
        function (this: { changes: number }, err: Error | null) {
          if (err) {
            reject(createDatabaseError('Failed to update event', err));
          } else if (this.changes === 0) {
            reject(createDatabaseError('Event not found or access denied'));
          } else {
            resolve();
          }
        },
      );
    });
  }, 'Update event');
}

export async function deleteEvent(
  eventId: string,
  userId: string,
): Promise<void> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'deleteEvent',
      'DELETE FROM events WHERE id = ? AND user_id = ?',
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run(
        [eventId, userId],
        function (this: { changes: number }, err: Error | null) {
          if (err) {
            reject(createDatabaseError('Failed to delete event', err));
          } else if (this.changes === 0) {
            reject(createDatabaseError('Event not found or access denied'));
          } else {
            resolve();
          }
        },
      );
    });
  }, 'Delete event');
}

// Event occurrence operations
export async function createEventOccurrence(occurrence: {
  id: string;
  event_id: string;
  gregorian_date: string;
  google_event_id: string;
}): Promise<void> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'createEventOccurrence',
      'INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id) VALUES (?, ?, ?, ?)',
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run(
        [
          occurrence.id,
          occurrence.event_id,
          occurrence.gregorian_date,
          occurrence.google_event_id,
        ],
        function (err: Error | null) {
          if (err) {
            reject(
              createDatabaseError('Failed to create event occurrence', err),
            );
          } else {
            resolve();
          }
        },
      );
    });
  }, 'Create event occurrence');
}

export async function getEventOccurrencesByEventId(
  eventId: string,
): Promise<EventOccurrence[]> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'getEventOccurrencesByEventId',
      'SELECT * FROM event_occurrences WHERE event_id = ? ORDER BY gregorian_date',
    );
    return new Promise<EventOccurrence[]>((resolve, reject) => {
      stmt.all([eventId], (err: Error | null, rows?: EventOccurrence[]) => {
        if (err) {
          reject(createDatabaseError('Failed to get event occurrences', err));
        } else {
          resolve(rows || []);
        }
      });
    });
  }, 'Get event occurrences by event ID');
}

export async function deleteEventOccurrencesByEventId(
  eventId: string,
): Promise<void> {
  return withDatabaseRetry(async () => {
    const stmt = getPreparedStatement(
      'deleteEventOccurrencesByEventId',
      'DELETE FROM event_occurrences WHERE event_id = ?',
    );
    return new Promise<void>((resolve, reject) => {
      stmt.run([eventId], function (err: Error | null) {
        if (err) {
          reject(
            createDatabaseError('Failed to delete event occurrences', err),
          );
        } else {
          resolve();
        }
      });
    });
  }, 'Delete event occurrences by event ID');
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
  return withDatabaseRetry(async () => {
    return new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(createDatabaseError('Failed to begin transaction', err));
            return;
          }

          const stmt = getPreparedStatement(
            'createEventOccurrence',
            'INSERT INTO event_occurrences (id, event_id, gregorian_date, google_event_id) VALUES (?, ?, ?, ?)',
          );

          let completed = 0;
          let hasError = false;

          occurrences.forEach((occurrence) => {
            stmt.run(
              [
                occurrence.id,
                occurrence.event_id,
                occurrence.gregorian_date,
                occurrence.google_event_id,
              ],
              (err: Error | null) => {
                if (err && !hasError) {
                  hasError = true;
                  db.run('ROLLBACK', () => {
                    reject(
                      createDatabaseError(
                        'Failed to create event occurrence in batch',
                        err,
                      ),
                    );
                  });
                  return;
                }

                completed++;
                if (completed === occurrences.length && !hasError) {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      reject(
                        createDatabaseError(
                          'Failed to commit transaction',
                          commitErr,
                        ),
                      );
                    } else {
                      resolve();
                    }
                  });
                }
              },
            );
          });
        });
      });
    });
  }, 'Create event occurrences batch');
}

// Performance monitoring
export function logPreparedStatementStats() {
  console.log(`Prepared statements cache size: ${preparedStatements.size}`);
  console.log('Cached statements:', Array.from(preparedStatements.keys()));
}

// Cleanup function for graceful shutdown
export function cleanupPreparedStatements() {
  preparedStatements.forEach((stmt, key) => {
    try {
      stmt.finalize();
    } catch (error) {
      console.error(`Error finalizing prepared statement ${key}:`, error);
    }
  });
  preparedStatements.clear();
}
