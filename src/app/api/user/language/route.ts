import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserLanguage, updateUserLanguage } from '@/lib/postgres-utils';

// GET: Get user's language preference
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { language } = body;

    // Validate language
    if (!language || !['en', 'he', 'es'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid language. Must be "en", "he", or "es"',
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update language preference',
      },
      { status: 500 },
    );
  }
}
