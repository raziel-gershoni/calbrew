import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import { UpdateApiClientSchema } from '@/lib/api-validation';
import { updateApiClient } from '@/lib/api-auth';
import { isAdmin } from '@/lib/admin';
import * as SentryHelper from '@/lib/logger/sentry';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  let session;
  let clientId: string | undefined;
  try {
    session = await getServerSession(authOptions);
    ({ clientId } = await params);

    if (!session?.user) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to PATCH /api/admin/api-clients/[clientId]',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/admin/api-clients/[clientId]',
          method: 'PATCH',
        },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    if (!isAdmin(session.user.email)) {
      SentryHelper.addBreadcrumb({
        message:
          'Non-admin access attempt to PATCH /api/admin/api-clients/[clientId]',
        category: 'auth',
        level: 'warning',
        data: {
          endpoint: '/api/admin/api-clients/[clientId]',
          email: session.user.email,
        },
      });
      return NextResponse.json(createErrorResponse('Forbidden', 'FORBIDDEN'), {
        status: 403,
      });
    }

    const body = await req.json();
    const validation = validateRequest(UpdateApiClientSchema, body);

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

    const updated = await updateApiClient(clientId, validation.data!);
    if (!updated) {
      return NextResponse.json(
        createErrorResponse(
          'Client not found or no changes provided',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(updated, 'API client updated successfully'),
    );
  } catch (error) {
    console.error('Error updating API client (admin):', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/admin/api-clients/[clientId]',
        method: 'PATCH',
        operation: 'admin-update-client',
      },
      extra: { userId: session?.user?.id, clientId },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
