import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';
import {
  DailyLearningPreferences,
  DEFAULT_DAILY_LEARNING_PREFERENCES,
} from '@/types/hebrewEventPreferences';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// GET /api/user/daily-learning-preferences - Get daily learning preferences
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
      daily_learning_preferences: DailyLearningPreferences | null;
    }>('SELECT daily_learning_preferences FROM users WHERE email = $1', [
      session.user.email,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const preferences =
      result.rows[0].daily_learning_preferences ||
      DEFAULT_DAILY_LEARNING_PREFERENCES;

    return NextResponse.json({
      success: true,
      data: { dailyLearningPreferences: preferences },
    });
  } catch (error) {
    console.error('Error getting daily learning preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/user/daily-learning-preferences - Update daily learning preferences
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
    const { dailyLearningPreferences } = body;

    if (
      !dailyLearningPreferences ||
      typeof dailyLearningPreferences !== 'object'
    ) {
      return NextResponse.json(
        { success: false, error: 'dailyLearningPreferences must be an object' },
        { status: 400 },
      );
    }

    // Validate that all required preference keys are present and are booleans
    const requiredKeys: (keyof DailyLearningPreferences)[] = [
      'dafYomi',
      'mishnaYomi',
      'yerushalmiYomi',
      'nachYomi',
    ];

    for (const key of requiredKeys) {
      if (typeof dailyLearningPreferences[key] !== 'boolean') {
        return NextResponse.json(
          { success: false, error: `${key} must be a boolean` },
          { status: 400 },
        );
      }
    }

    await query(
      'UPDATE users SET daily_learning_preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [JSON.stringify(dailyLearningPreferences), session.user.email],
    );

    return NextResponse.json({
      success: true,
      data: { dailyLearningPreferences },
    });
  } catch (error) {
    console.error('Error updating daily learning preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
