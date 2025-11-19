import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import {
  HebrewCalendarPreferences,
  DEFAULT_HEBREW_CALENDAR_PREFERENCES,
} from '@/types/hebrewEventPreferences';
import * as SentryHelper from '@/lib/logger/sentry';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// GET /api/user/hebrew-calendar-preferences - Get Hebrew calendar preferences
export async function GET(): Promise<NextResponse<ApiResponse>> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to GET /api/user/hebrew-calendar-preferences',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/user/hebrew-calendar-preferences',
          method: 'GET',
        },
      });
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

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/hebrew-calendar-preferences',
        method: 'GET',
        operation: 'get-hebrew-calendar-preferences',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

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
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to PUT /api/user/hebrew-calendar-preferences',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/user/hebrew-calendar-preferences',
          method: 'PUT',
        },
      });
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
      SentryHelper.addBreadcrumb({
        message:
          'Invalid preferences object in PUT /api/user/hebrew-calendar-preferences',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/user/hebrew-calendar-preferences',
          method: 'PUT',
          error: 'hebrewCalendarPreferences must be an object',
        },
      });
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
        SentryHelper.addBreadcrumb({
          message: `Invalid preference type in PUT /api/user/hebrew-calendar-preferences`,
          category: 'validation',
          level: 'info',
          data: {
            endpoint: '/api/user/hebrew-calendar-preferences',
            method: 'PUT',
            error: `${key} must be a boolean`,
            key,
          },
        });
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

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/hebrew-calendar-preferences',
        method: 'PUT',
        operation: 'update-hebrew-calendar-preferences',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
