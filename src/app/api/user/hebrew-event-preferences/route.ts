import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import {
  HebrewEventPreferences,
  DEFAULT_HEBREW_EVENT_PREFERENCES,
} from '@/types/hebrewEventPreferences';

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await query<{
      hebrew_event_preferences: HebrewEventPreferences;
    }>('SELECT hebrew_event_preferences FROM users WHERE id = $1', [
      session.user.id,
    ]);

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use stored preferences or default fallback
    const preferences =
      user.hebrew_event_preferences || DEFAULT_HEBREW_EVENT_PREFERENCES;

    return NextResponse.json({
      preferences,
    });
  } catch (error) {
    console.error('Error getting Hebrew event preferences:', error);
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

    const { preferences } = await request.json();

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences object' },
        { status: 400 },
      );
    }

    // Validate preference structure
    const requiredKeys: (keyof HebrewEventPreferences)[] = [
      'majorHolidays',
      'minorHolidays',
      'fastDays',
      'roshChodesh',
      'modernHolidays',
      'torahReadings',
      'specialShabbat',
      'omerCount',
      'dafYomi',
      'mishnaYomi',
      'yerushalmiYomi',
      'nachYomi',
      'chanukahCandles',
    ];

    for (const key of requiredKeys) {
      if (typeof preferences[key] !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid value for ${key}. Expected boolean.` },
          { status: 400 },
        );
      }
    }

    const result = await query(
      'UPDATE users SET hebrew_event_preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(preferences), session.user.id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error updating Hebrew event preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
