import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  processUserYearProgression,
  getYearProgressionSummary,
} from '@/lib/year-progression';
import { getCurrentCalendarId } from '@/lib/postgres-utils';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import { AppError } from '@/lib/retry';

/**
 * GET /api/year-progression
 * Check year progression status for current user
 */
export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const summary = await getYearProgressionSummary(session.user.id);

    return NextResponse.json(createSuccessResponse(summary));
  } catch (error) {
    console.error('Get year progression summary error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse(
        'Failed to get year progression summary',
        'INTERNAL_ERROR',
      ),
      { status: 500 },
    );
  }
}

/**
 * POST /api/year-progression
 * Process year progression for current user
 */
export async function POST(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    if (!session.accessToken) {
      return NextResponse.json(
        createErrorResponse(
          'Google Calendar access token not available',
          'AUTH_ERROR',
        ),
        { status: 401 },
      );
    }

    // Get user's calendar ID
    const calendarId = await getCurrentCalendarId(session.user.id);
    if (!calendarId) {
      return NextResponse.json(
        createErrorResponse('Google Calendar not configured', 'CALENDAR_ERROR'),
        { status: 400 },
      );
    }

    // Process year progression
    const result = await processUserYearProgression(
      session.user.id,
      session.accessToken,
      calendarId,
    );

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    console.error('Process year progression error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse(
        'Failed to process year progression',
        'INTERNAL_ERROR',
      ),
      { status: 500 },
    );
  }
}
