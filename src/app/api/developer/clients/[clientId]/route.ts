import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import { deleteApiClient, verifyClientOwnership } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

export async function DELETE(
  _req: NextRequest,
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
          'Unauthorized access attempt to DELETE /api/developer/clients/[clientId]',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/developer/clients/[clientId]',
          method: 'DELETE',
        },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const isOwner = await verifyClientOwnership(clientId, session.user.id);
    if (!isOwner) {
      return NextResponse.json(createErrorResponse('Forbidden', 'FORBIDDEN'), {
        status: 403,
      });
    }

    const deleted = await deleteApiClient(clientId, session.user.id);
    if (!deleted) {
      return NextResponse.json(
        createErrorResponse('Client not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(null, 'API client deleted successfully'),
    );
  } catch (error) {
    console.error('Error deleting API client:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients/[clientId]',
        method: 'DELETE',
        operation: 'delete-api-client',
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
