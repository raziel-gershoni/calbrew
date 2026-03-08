import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import { revokeApiKey, verifyClientOwnership } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; keyId: string }> },
) {
  let session;
  let clientId: string | undefined;
  let keyId: string | undefined;
  try {
    session = await getServerSession(authOptions);
    ({ clientId, keyId } = await params);

    if (!session?.user) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to DELETE /api/developer/clients/[clientId]/keys/[keyId]',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/developer/clients/[clientId]/keys/[keyId]',
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

    const revoked = await revokeApiKey(keyId, clientId);
    if (!revoked) {
      return NextResponse.json(
        createErrorResponse(
          'API key not found or already revoked',
          'NOT_FOUND',
        ),
        { status: 404 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(null, 'API key revoked successfully'),
    );
  } catch (error) {
    console.error('Error revoking API key:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients/[clientId]/keys/[keyId]',
        method: 'DELETE',
        operation: 'revoke-api-key',
      },
      extra: { userId: session?.user?.id, clientId, keyId },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
