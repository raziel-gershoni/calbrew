import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserLanguage, updateUserLanguage } from '@/lib/postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

// GET: Get user's language preference
export async function GET(_request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/language',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/language', method: 'GET' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    try {
      const language = await getUserLanguage(session.user.id);

      return NextResponse.json({
        success: true,
        data: { language },
      });
    } catch (error) {
      // If user not found, force re-authentication
      if (error instanceof Error && error.message.includes('User not found')) {
        SentryHelper.addBreadcrumb({
          message: 'User not found in GET /api/user/language',
          category: 'auth',
          level: 'info',
          data: { endpoint: '/api/user/language', method: 'GET' },
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
    console.error('Error fetching user language:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/language',
        method: 'GET',
        operation: 'get-language',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch language preference',
      },
      { status: 500 },
    );
  }
}

// PUT: Update user's language preference
export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to PUT /api/user/language',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/language', method: 'PUT' },
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { language } = body;

    // Validate language
    if (!language || !['en', 'he', 'es', 'ru', 'de'].includes(language)) {
      SentryHelper.addBreadcrumb({
        message: 'Invalid language in PUT /api/user/language',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/user/language',
          method: 'PUT',
          language,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid language. Must be "en", "he", "es", "ru", or "de"',
        },
        { status: 400 },
      );
    }

    await updateUserLanguage(session.user.id, language);

    return NextResponse.json({
      success: true,
      data: { language },
    });
  } catch (error) {
    console.error('Error updating user language:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/language',
        method: 'PUT',
        operation: 'update-language',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update language preference',
      },
      { status: 500 },
    );
  }
}
