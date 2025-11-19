import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import * as SentryHelper from '@/lib/logger/sentry';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// GET /api/user/daily-learning - Get daily learning enabled status
export async function GET(): Promise<NextResponse<ApiResponse>> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/daily-learning',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/daily-learning', method: 'GET' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const result = await query<{ daily_learning_enabled: boolean }>(
      'SELECT daily_learning_enabled FROM users WHERE email = $1',
      [session.user.email],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyLearningEnabled: result.rows[0].daily_learning_enabled ?? true,
      },
    });
  } catch (error) {
    console.error('Error getting daily learning preference:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/daily-learning',
        method: 'GET',
        operation: 'get-daily-learning',
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

// PUT /api/user/daily-learning - Update daily learning enabled status
export async function PUT(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to PUT /api/user/daily-learning',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/daily-learning', method: 'PUT' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { dailyLearningEnabled } = body;

    if (typeof dailyLearningEnabled !== 'boolean') {
      SentryHelper.addBreadcrumb({
        message: 'Invalid value in PUT /api/user/daily-learning',
        category: 'validation',
        level: 'info',
        data: { endpoint: '/api/user/daily-learning', method: 'PUT' },
      });
      return NextResponse.json(
        { success: false, error: 'dailyLearningEnabled must be a boolean' },
        { status: 400 },
      );
    }

    await query(
      'UPDATE users SET daily_learning_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [dailyLearningEnabled, session.user.email],
    );

    return NextResponse.json({
      success: true,
      data: { dailyLearningEnabled },
    });
  } catch (error) {
    console.error('Error updating daily learning preference:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/daily-learning',
        method: 'PUT',
        operation: 'update-daily-learning',
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
