import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  EventIdSchema,
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import { getEventById, isEventSynced } from '@/lib/postgres-utils';
import { AppError } from '@/lib/retry';
import * as SentryHelper from '@/lib/logger/sentry';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  let id;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to GET /api/events/[id]/sync-status',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/events/[id]/sync-status', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    ({ id } = await params);

    // Validate event ID
    const idValidation = validateRequest(EventIdSchema, { id });
    if (!idValidation.success) {
      SentryHelper.addBreadcrumb({
        message: 'Invalid event ID in GET /api/events/[id]/sync-status',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/events/[id]/sync-status',
          method: 'GET',
          eventId: id,
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

    // Check if event exists and belongs to user
    const existingEvent = await getEventById(id, session.user.id);
    if (!existingEvent) {
      return NextResponse.json(
        createErrorResponse('Event not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    // Check sync status
    const synced = await isEventSynced(id);

    return NextResponse.json(createSuccessResponse({ synced }));
  } catch (error) {
    console.error('Get sync status error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/events/[id]/sync-status',
        method: 'GET',
        operation: 'get-sync-status',
      },
      extra: {
        userId: session?.user?.id,
        eventId: id,
      },
      level: 'error',
    });

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status:
          error.code === 'AUTH_ERROR'
            ? 401
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : error.code === 'NOT_FOUND'
                ? 404
                : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to get sync status', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
