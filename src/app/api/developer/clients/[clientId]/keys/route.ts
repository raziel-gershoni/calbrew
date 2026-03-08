import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import { CreateApiKeySchema } from '@/lib/api-validation';
import {
  createApiKey,
  listApiKeysByClientId,
  verifyClientOwnership,
} from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

const MAX_KEYS_PER_CLIENT = 5;

export async function GET(
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
          'Unauthorized access attempt to GET /api/developer/clients/[clientId]/keys',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/developer/clients/[clientId]/keys',
          method: 'GET',
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

    const keys = await listApiKeysByClientId(clientId);
    return NextResponse.json(createSuccessResponse(keys));
  } catch (error) {
    console.error('Error listing API keys:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients/[clientId]/keys',
        method: 'GET',
        operation: 'list-api-keys',
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

export async function POST(
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
          'Unauthorized access attempt to POST /api/developer/clients/[clientId]/keys',
        category: 'auth',
        level: 'info',
        data: {
          endpoint: '/api/developer/clients/[clientId]/keys',
          method: 'POST',
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

    const body = await req.json();
    const validation = validateRequest(CreateApiKeySchema, body);

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

    // Enforce key limit
    const existingKeys = await listApiKeysByClientId(clientId);
    const activeKeys = existingKeys.filter((k) => k.is_active);
    if (activeKeys.length >= MAX_KEYS_PER_CLIENT) {
      return NextResponse.json(
        createErrorResponse(
          `Maximum of ${MAX_KEYS_PER_CLIENT} active API keys allowed per client`,
          'LIMIT_EXCEEDED',
        ),
        { status: 400 },
      );
    }

    const { name, scopes, expiresInDays } = validation.data!;
    const result = await createApiKey(clientId, name, scopes, expiresInDays);

    if (!result) {
      return NextResponse.json(
        createErrorResponse('Failed to create API key', 'INTERNAL_ERROR'),
        { status: 500 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(
        { keyId: result.keyId, plaintextKey: result.plaintextKey },
        'API key created. Save this key — it will not be shown again.',
      ),
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating API key:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients/[clientId]/keys',
        method: 'POST',
        operation: 'create-api-key',
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
