import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { google } from 'googleapis';
import { HDate } from '@hebcal/core';

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

    await calendar.events.patch({
      calendarId: session.user.calbrew_calendar_id,
      eventId: occurrence.google_event_id,
      requestBody: {
        summary: eventTitle,
        description,
      },
    });
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

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({ access_token: session.accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    for (const occurrence of occurrences) {
      await calendar.events.delete({
        calendarId: session.user.calbrew_calendar_id,
        eventId: occurrence.google_event_id,
      });
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
