/**
 * Personal Access Token Management Endpoints
 * GET /api/user/tokens - List user's PATs
 * POST /api/user/tokens - Create a new PAT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createPAT, listPATsByUserId } from '@/lib/api-auth';
import { validateRequest } from '@/lib/validation';
import { CreatePATSchema } from '@/lib/api-validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import * as SentryHelper from '@/lib/logger/sentry';

export async function GET(): Promise<NextResponse> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/user/tokens',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/tokens', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 },
      );
    }

    const tokens = await listPATsByUserId(session.user.id);

    return NextResponse.json(
      createSuccessResponse(
        tokens.map((t) => ({
          id: t.id,
          name: t.name,
          tokenPrefix: t.token_prefix,
          scopes: t.scopes,
          lastUsedAt: t.last_used_at,
          expiresAt: t.expires_at,
          isActive: t.is_active,
          createdAt: t.created_at,
        })),
      ),
    );
  } catch (error) {
    console.error('Error listing PATs:', error);
    SentryHelper.captureException(error, {
      tags: { endpoint: '/api/user/tokens', method: 'GET' },
      extra: { userId: session?.user?.id },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to POST /api/user/tokens',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/user/tokens', method: 'POST' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = validateRequest(CreatePATSchema, body);

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

    const { name, scopes, expiresInDays } = validation.data!;

    const result = await createPAT(
      session.user.id,
      name,
      scopes,
      expiresInDays,
    );

    if (!result) {
      return NextResponse.json(
        createErrorResponse('Failed to create token', 'CREATE_ERROR'),
        { status: 500 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(
        {
          id: result.id,
          token: result.plaintextToken,
        },
        'Token created successfully. Copy the token now — it will not be shown again.',
      ),
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating PAT:', error);
    SentryHelper.captureException(error, {
      tags: { endpoint: '/api/user/tokens', method: 'POST' },
      extra: { userId: session?.user?.id },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
