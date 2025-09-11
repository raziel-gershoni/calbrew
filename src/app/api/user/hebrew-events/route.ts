import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return new Promise<Response>((resolve) => {
      db.get(
        'SELECT hebrew_events_enabled FROM users WHERE id = ?',
        [session.user.id],
        (err, row: { hebrew_events_enabled: number } | undefined) => {
          if (err) {
            console.error('Database error:', err);
            resolve(
              NextResponse.json({ error: 'Database error' }, { status: 500 }),
            );
          } else if (row) {
            resolve(
              NextResponse.json({
                hebrewEventsEnabled: Boolean(row.hebrew_events_enabled),
              }),
            );
          } else {
            resolve(
              NextResponse.json({ error: 'User not found' }, { status: 404 }),
            );
          }
        },
      );
    });
  } catch (error) {
    console.error('Error getting Hebrew events preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { hebrewEventsEnabled } = await request.json();

    if (typeof hebrewEventsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid hebrewEventsEnabled value' },
        { status: 400 },
      );
    }

    return new Promise<Response>((resolve) => {
      db.run(
        'UPDATE users SET hebrew_events_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hebrewEventsEnabled, session.user.id],
        function (err) {
          if (err) {
            console.error('Database error:', err);
            resolve(
              NextResponse.json({ error: 'Database error' }, { status: 500 }),
            );
          } else if (this.changes === 0) {
            resolve(
              NextResponse.json({ error: 'User not found' }, { status: 404 }),
            );
          } else {
            resolve(
              NextResponse.json({
                success: true,
                hebrewEventsEnabled,
              }),
            );
          }
        },
      );
    });
  } catch (error) {
    console.error('Error updating Hebrew events preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
