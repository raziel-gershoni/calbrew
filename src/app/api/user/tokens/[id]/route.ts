/**
 * Single PAT Management Endpoint
 * DELETE /api/user/tokens/[id] - Revoke a PAT
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revokePAT } from '@/lib/api-auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import * as SentryHelper from '@/lib/logger/sentry';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let session;
  let tokenId: string | undefined;

  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to DELETE /api/user/tokens/[id]',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/tokens/[id]', method: 'DELETE' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 },
      );
    }

    ({ id: tokenId } = await params);

    const revoked = await revokePAT(tokenId, session.user.id);

    if (!revoked) {
      return NextResponse.json(
        createErrorResponse('Token not found', 'NOT_FOUND'),
        { status: 404 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(null, 'Token revoked successfully'),
    );
  } catch (error) {
    console.error('Error revoking PAT:', error);
    SentryHelper.captureException(error, {
      tags: { endpoint: '/api/user/tokens/[id]', method: 'DELETE' },
      extra: { userId: session?.user?.id, tokenId },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
