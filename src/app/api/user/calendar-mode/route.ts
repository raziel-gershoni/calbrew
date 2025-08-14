import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCalendarMode, updateUserCalendarMode } from '@/lib/db-utils';

// GET: Get user's calendar mode preference
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const calendarMode = await getUserCalendarMode(session.user.id);

    return NextResponse.json({
      success: true,
      data: { calendarMode },
    });
  } catch (error) {
    console.error('Error fetching user calendar mode:', error);
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
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { calendarMode } = body;

    // Validate calendar mode
    if (!calendarMode || !['hebrew', 'gregorian'].includes(calendarMode)) {
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update calendar mode preference',
      },
      { status: 500 },
    );
  }
}
