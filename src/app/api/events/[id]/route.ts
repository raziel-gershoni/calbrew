import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { google } from 'googleapis';
import { HDate } from '@hebcal/core';
import {
  ensureCalendarExists,
  checkCalendarExists,
} from '@/lib/google-calendar';

// Helper function to get current calendar ID from database
async function getCurrentCalendarId(userId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT calbrew_calendar_id FROM users WHERE id = ?',
      [userId],
      (err, row: { calbrew_calendar_id: string | null } | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve(row?.calbrew_calendar_id || null);
        }
      },
    );
  });
}

interface EventOccurrence {
  id: string;
  event_id: string;
  gregorian_date: string;
  google_event_id: string;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, hebrew_year } = await req.json();
  const { id } = await params;

  await new Promise<void>((resolve, reject) => {
    db.run(
      'UPDATE events SET title = ?, description = ? WHERE id = ? AND user_id = ?',
      [title, description, id, session.user.id],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });

  const occurrences = await new Promise<EventOccurrence[]>(
    (resolve, reject) => {
      db.all(
        'SELECT * FROM event_occurrences WHERE event_id = ?',
        [id],
        (err, rows: EventOccurrence[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        },
      );
    },
  );

  // Get fresh calendar ID from database (more reliable than session)
  let calendarId = await getCurrentCalendarId(session.user.id);

  if (!calendarId) {
    // Only check/create calendar if we don't have an ID stored
    const calendarCheck = await ensureCalendarExists(
      session.accessToken!,
      session.user.id,
      undefined, // No current ID to check
    );

    if (!calendarCheck.calendarId) {
      return NextResponse.json(
        {
          error: `Failed to create calendar: ${calendarCheck.error || 'Unknown error'}`,
        },
        { status: 500 },
      );
    }

    calendarId = calendarCheck.calendarId;
    console.info(`Created/found Calbrew calendar: ${calendarId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({ access_token: session.accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  for (const occurrence of occurrences) {
    const anniversary =
      new HDate(new Date(occurrence.gregorian_date)).getFullYear() -
      hebrew_year;
    const eventTitle = anniversary > 0 ? `(${anniversary}) ${title}` : title;

    try {
      await calendar.events.patch({
        calendarId: calendarId,
        eventId: occurrence.google_event_id,
        requestBody: {
          summary: eventTitle,
          description,
        },
      });
    } catch (error: unknown) {
      // If calendar not found (404), try to create/find a new calendar and retry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.status === 404) {
        console.warn(
          `Calendar ${calendarId} not found, attempting to create/find new calendar for update`,
        );

        try {
          const calendarCheck = await ensureCalendarExists(
            session.accessToken!,
            session.user.id,
            undefined, // Force search/create
          );

          if (calendarCheck.calendarId) {
            calendarId = calendarCheck.calendarId;
            console.info(`Using new calendar for update: ${calendarId}`);

            // Retry the update with new calendar ID
            await calendar.events.patch({
              calendarId: calendarId,
              eventId: occurrence.google_event_id,
              requestBody: {
                summary: eventTitle,
                description,
              },
            });
          } else {
            console.error(
              `Failed to update event occurrence ${occurrence.google_event_id}: Could not create/find calendar`,
            );
          }
        } catch (retryError) {
          console.error(
            `Failed to update event occurrence ${occurrence.google_event_id} even after calendar retry:`,
            retryError,
          );
        }
      } else {
        console.error(
          `Failed to update event occurrence ${occurrence.google_event_id}:`,
          error,
        );
      }
      // Continue with other occurrences even if one fails
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const occurrences = await new Promise<EventOccurrence[]>(
    (resolve, reject) => {
      db.all(
        'SELECT * FROM event_occurrences WHERE event_id = ?',
        [id],
        (err, rows: EventOccurrence[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        },
      );
    },
  );

  if (occurrences.length === 0) {
    // If there are no occurrences, just delete the master event
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM events WHERE id = ? AND user_id = ?',
        [id, session.user.id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
    return NextResponse.json({ success: true });
  }

  // Get the current calendar ID from database
  const currentCalendarId = await getCurrentCalendarId(session.user.id);

  if (!currentCalendarId) {
    console.warn(
      'No calendar ID found for user. Proceeding with local deletion only.',
    );

    // Delete locally only
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM event_occurrences WHERE event_id = ?',
        [id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM events WHERE id = ?', [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({
      success: true,
      warning: 'No calendar information found. Event deleted locally only.',
    });
  }

  // Check if calendar exists before trying to delete events
  const calendarExists = await checkCalendarExists(
    session.accessToken!,
    currentCalendarId,
  );

  if (!calendarExists) {
    console.warn(
      `Calendar ${currentCalendarId} not found. Proceeding with local deletion only.`,
    );

    // Delete locally only
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM event_occurrences WHERE event_id = ?',
        [id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM events WHERE id = ?', [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({
      success: true,
      warning:
        'Calendar not found in Google Calendar. Event deleted locally only.',
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({ access_token: session.accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    for (const occurrence of occurrences) {
      try {
        await calendar.events.delete({
          calendarId: currentCalendarId,
          eventId: occurrence.google_event_id,
        });
      } catch (error) {
        console.error(
          `Failed to delete event occurrence ${occurrence.google_event_id}:`,
          error,
        );
        // Continue with other occurrences even if one fails
      }
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM event_occurrences WHERE event_id = ?',
        [id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM events WHERE id = ?', [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete events from Google Calendar' },
      { status: 500 },
    );
  }
}
