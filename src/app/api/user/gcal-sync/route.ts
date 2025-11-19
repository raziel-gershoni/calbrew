import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import {
  getUserGcalSyncEnabled,
  updateUserGcalSyncEnabled,
} from '@/lib/postgres-utils';
import { AppError } from '@/lib/retry';
import * as SentryHelper from '@/lib/logger/sentry';

const UpdateSyncPreferenceSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/gcal-sync',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/gcal-sync', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const enabled = await getUserGcalSyncEnabled(session.user.id);
    return NextResponse.json(createSuccessResponse({ enabled }));
  } catch (error) {
    console.error('Get sync preference error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/gcal-sync',
        method: 'GET',
        operation: 'get-gcal-sync',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    if (error instanceof AppError) {
      return NextResponse.json(error.toApiError(), {
        status: error.code === 'AUTH_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to get sync preference', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session || !session.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to PUT /api/user/gcal-sync',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/gcal-sync', method: 'PUT' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validation = validateRequest(UpdateSyncPreferenceSchema, requestBody);

    if (!validation.success) {
      SentryHelper.addBreadcrumb({
        message: 'Validation error in PUT /api/user/gcal-sync',
        category: 'validation',
        level: 'info',
        data: {
          endpoint: '/api/user/gcal-sync',
          method: 'PUT',
          validationErrors: validation.details,
        },
      });
      return NextResponse.json(
        createErrorResponse(
          validation.error!,
          'VALIDATION_ERROR',
          validation.details,
        ),
        { status: 400 },
      );
    }

    const { enabled } = validation.data!;

    await updateUserGcalSyncEnabled(session.user.id, enabled);

    return NextResponse.json(
      createSuccessResponse(
        { enabled },
        'Sync preference updated successfully',
      ),
    );
  } catch (error) {
    console.error('Update sync preference error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/user/gcal-sync',
        method: 'PUT',
        operation: 'update-gcal-sync',
      },
      extra: {
        userId: session?.user?.id,
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
              : 500,
      });
    }

    return NextResponse.json(
      createErrorResponse('Failed to update sync preference', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
