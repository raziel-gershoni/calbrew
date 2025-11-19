import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserCalendarMode,
  updateUserCalendarMode,
} from '@/lib/postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

// GET: Get user's calendar mode preference
export async function GET(_request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/calendar-mode',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/calendar-mode', method: 'GET' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    try {
      const calendarMode = await getUserCalendarMode(session.user.id);

      return NextResponse.json({
        success: true,
        data: { calendarMode },
      });
    } catch (error) {
      // If user not found, force re-authentication
      if (error instanceof Error && error.message.includes('User not found')) {
        SentryHelper.addBreadcrumb({
          message: 'User not found in GET /api/user/calendar-mode',
          category: 'auth',
          level: 'info',
          data: { endpoint: '/api/user/calendar-mode', method: 'GET' },
        });
        return NextResponse.json(
          {
            success: false,
            error: 'User not found in database',
            code: 'USER_NOT_FOUND_PLEASE_REAUTH',
          },
          { status: 401 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching user calendar mode:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/calendar-mode',
        method: 'GET',
        operation: 'get-calendar-mode',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch calendar mode preference',
      },
      { status: 500 },
    );
  }
}

// PUT: Update user's calendar mode preference
export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to PUT /api/user/calendar-mode',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/calendar-mode', method: 'PUT' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { calendarMode } = body;

    // Validate calendar mode
    if (!calendarMode || !['hebrew', 'gregorian'].includes(calendarMode)) {
      SentryHelper.addBreadcrumb({
        message: 'Invalid calendar mode in PUT /api/user/calendar-mode',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/user/calendar-mode',
          method: 'PUT',
          calendarMode,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid calendar mode. Must be "hebrew" or "gregorian"',
        },
        { status: 400 },
      );
    }

    await updateUserCalendarMode(session.user.id, calendarMode);

    return NextResponse.json({
      success: true,
      data: { calendarMode },
    });
  } catch (error) {
    console.error('Error updating user calendar mode:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/calendar-mode',
        method: 'PUT',
        operation: 'update-calendar-mode',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update calendar mode preference',
      },
      { status: 500 },
    );
  }
}
