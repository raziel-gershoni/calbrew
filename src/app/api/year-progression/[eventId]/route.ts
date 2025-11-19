import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  checkEventYearProgression,
  syncEventNewYears,
} from '@/lib/year-progression';
import { getCurrentCalendarId } from '@/lib/postgres-utils';
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import { AppError } from '@/lib/retry';
import * as SentryHelper from '@/lib/logger/sentry';
import { z } from 'zod';

const EventIdSchema = z.object({
  eventId: z.string().uuid(),
});

/**
 * GET /api/year-progression/[eventId]
 * Check year progression status for specific event
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  let session;
  let eventId;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to GET /api/year-progression/[eventId]',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/year-progression/[eventId]', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    ({ eventId } = await params);

    // Validate event ID
    const idValidation = validateRequest(EventIdSchema, { eventId });
    if (!idValidation.success) {
      SentryHelper.addBreadcrumb({
        message: 'Invalid event ID in GET /api/year-progression/[eventId]',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/year-progression/[eventId]',
          method: 'GET',
          eventId,
          validationErrors: idValidation.details,
        },
      });
      return NextResponse.json(
        createErrorResponse(
          idValidation.error!,
          'VALIDATION_ERROR',
          idValidation.details,
        ),
        { status: 400 },
      );
    }

    const status = await checkEventYearProgression(eventId, session.user.id);

    if (!status) {
      return NextResponse.json(
        createErrorResponse('Event not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    return NextResponse.json(createSuccessResponse(status));
  } catch (error) {
    console.error('Get event year progression error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/year-progression/[eventId]',
        method: 'GET',
        operation: 'get-event-year-progression',
      },
      extra: {
        userId: session?.user?.id,
        eventId,
      },
      level: 'error',
    });

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse(
        'Failed to get event year progression',
        'INTERNAL_ERROR',
      ),
      { status: 500 },
    );
  }
}

/**
 * POST /api/year-progression/[eventId]
 * Sync new years for specific event
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  let session;
  let eventId;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to POST /api/year-progression/[eventId]',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/year-progression/[eventId]', method: 'POST' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    if (!session.accessToken) {
      SentryHelper.addBreadcrumb({
        message: 'Missing access token in POST /api/year-progression/[eventId]',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/year-progression/[eventId]', method: 'POST' },
      });
      return NextResponse.json(
        createErrorResponse(
          'Google Calendar access token not available',
          'AUTH_ERROR',
        ),
        { status: 401 },
      );
    }

    ({ eventId } = await params);

    // Validate event ID
    const idValidation = validateRequest(EventIdSchema, { eventId });
    if (!idValidation.success) {
      SentryHelper.addBreadcrumb({
        message: 'Invalid event ID in POST /api/year-progression/[eventId]',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/year-progression/[eventId]',
          method: 'POST',
          eventId,
          validationErrors: idValidation.details,
        },
      });
      return NextResponse.json(
        createErrorResponse(
          idValidation.error!,
          'VALIDATION_ERROR',
          idValidation.details,
        ),
        { status: 400 },
      );
    }

    // Get user's calendar ID
    const calendarId = await getCurrentCalendarId(session.user.id);
    if (!calendarId) {
      SentryHelper.addBreadcrumb({
        message:
          'Calendar not configured in POST /api/year-progression/[eventId]',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/year-progression/[eventId]',
          method: 'POST',
          userId: session.user.id,
          eventId,
        },
      });
      return NextResponse.json(
        createErrorResponse('Google Calendar not configured', 'CALENDAR_ERROR'),
        { status: 400 },
      );
    }

    // Sync new years for the event
    const result = await syncEventNewYears(
      eventId,
      session.user.id,
      session.accessToken,
      calendarId,
    );

    if (!result.success) {
      return NextResponse.json(
        createErrorResponse(
          result.error || 'Failed to sync event years',
          'SYNC_ERROR',
        ),
        { status: 500 },
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        eventId,
        yearsSynced: result.yearsSynced,
        message: `Successfully synced ${result.yearsSynced.length} new years`,
      }),
    );
  } catch (error) {
    console.error('Sync event year progression error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/year-progression/[eventId]',
        method: 'POST',
        operation: 'sync-event-year-progression',
      },
      extra: {
        userId: session?.user?.id,
        eventId,
      },
      level: 'error',
    });

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse(
        'Failed to sync event year progression',
        'INTERNAL_ERROR',
      ),
      { status: 500 },
    );
  }
}
