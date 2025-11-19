import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import * as SentryHelper from '@/lib/logger/sentry';

export async function GET(): Promise<Response> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/hebrew-events',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/hebrew-events', method: 'GET' },
      });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await query<{ hebrew_events_enabled: boolean }>(
      'SELECT hebrew_events_enabled FROM users WHERE id = $1',
      [session.user.id],
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

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/hebrew-events',
        method: 'GET',
        operation: 'get-hebrew-events',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to PUT /api/user/hebrew-events',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/hebrew-events', method: 'PUT' },
      });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { hebrewEventsEnabled } = await request.json();

    if (typeof hebrewEventsEnabled !== 'boolean') {
      SentryHelper.addBreadcrumb({
        message: 'Invalid value in PUT /api/user/hebrew-events',
        category: 'validation',
        level: 'info',
        data: { endpoint: '/api/user/hebrew-events', method: 'PUT' },
      });
      return NextResponse.json(
        { error: 'Invalid hebrewEventsEnabled value' },
        { status: 400 },
      );
    }

    const result = await query(
      'UPDATE users SET hebrew_events_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hebrewEventsEnabled, session.user.id],
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

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/hebrew-events',
        method: 'PUT',
        operation: 'update-hebrew-events',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
