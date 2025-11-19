import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import * as SentryHelper from '@/lib/logger/sentry';

interface UserCalendarInfo {
  calbrew_calendar_id: string | null;
}

export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/calendar',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/calendar', method: 'GET' },
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query<UserCalendarInfo>(
      'SELECT calbrew_calendar_id FROM users WHERE id = $1',
      [session.user.id],
    );

    const userInfo = result.rows[0];

    return NextResponse.json({
      calbrew_calendar_id: userInfo?.calbrew_calendar_id || null,
    });
  } catch (error) {
    console.error('Failed to fetch user calendar info:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/calendar',
        method: 'GET',
        operation: 'get-calendar-info',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch calendar information' },
      { status: 500 },
    );
  }
}
