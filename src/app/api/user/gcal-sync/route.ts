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
} from '@/lib/db-utils';
import { AppError } from '@/lib/retry';

const UpdateSyncPreferenceSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const enabled = await getUserGcalSyncEnabled(session.user.id);
    return NextResponse.json(createSuccessResponse({ enabled }));
  } catch (error) {
    console.error('Get sync preference error:', error);

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
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validation = validateRequest(UpdateSyncPreferenceSchema, requestBody);

    if (!validation.success) {
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
