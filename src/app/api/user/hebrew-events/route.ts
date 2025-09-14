import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await query<{ hebrew_events_enabled: boolean }>(
      'SELECT hebrew_events_enabled FROM users WHERE id = $1',
      [session.user.id]
    );
    
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      hebrewEventsEnabled: Boolean(user.hebrew_events_enabled),
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

    const result = await query(
      'UPDATE users SET hebrew_events_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hebrewEventsEnabled, session.user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hebrewEventsEnabled,
    });
  } catch (error) {
    console.error('Error updating Hebrew events preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
