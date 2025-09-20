import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import {
  HebrewCalendarPreferences,
  DEFAULT_HEBREW_CALENDAR_PREFERENCES,
} from '@/types/hebrewEventPreferences';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// GET /api/user/hebrew-calendar-preferences - Get Hebrew calendar preferences
export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const result = await query<{
      hebrew_calendar_preferences: HebrewCalendarPreferences | null;
    }>('SELECT hebrew_calendar_preferences FROM users WHERE email = $1', [
      session.user.email,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const preferences =
      result.rows[0].hebrew_calendar_preferences ||
      DEFAULT_HEBREW_CALENDAR_PREFERENCES;

    return NextResponse.json({
      success: true,
      data: { hebrewCalendarPreferences: preferences },
    });
  } catch (error) {
    console.error('Error getting Hebrew calendar preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/user/hebrew-calendar-preferences - Update Hebrew calendar preferences
export async function PUT(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { hebrewCalendarPreferences } = body;

    if (
      !hebrewCalendarPreferences ||
      typeof hebrewCalendarPreferences !== 'object'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'hebrewCalendarPreferences must be an object',
        },
        { status: 400 },
      );
    }

    // Validate that all required preference keys are present and are booleans
    const requiredKeys: (keyof HebrewCalendarPreferences)[] = [
      'majorHolidays',
      'minorHolidays',
      'fastDays',
      'roshChodesh',
      'modernHolidays',
      'torahReadings',
      'specialShabbat',
      'omerCount',
    ];

    for (const key of requiredKeys) {
      if (typeof hebrewCalendarPreferences[key] !== 'boolean') {
        return NextResponse.json(
          { success: false, error: `${key} must be a boolean` },
          { status: 400 },
        );
      }
    }

    await query(
      'UPDATE users SET hebrew_calendar_preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [JSON.stringify(hebrewCalendarPreferences), session.user.email],
    );

    return NextResponse.json({
      success: true,
      data: { hebrewCalendarPreferences },
    });
  } catch (error) {
    console.error('Error updating Hebrew calendar preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
