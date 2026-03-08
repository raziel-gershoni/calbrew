import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequest,
} from '@/lib/validation';
import { CreateApiClientSchema } from '@/lib/api-validation';
import { createApiClient, listApiClientsByUserId } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

const MAX_CLIENTS_PER_USER = 3;

export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/developer/clients',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/developer/clients', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const clients = await listApiClientsByUserId(session.user.id);
    return NextResponse.json(createSuccessResponse(clients));
  } catch (error) {
    console.error('Error listing developer clients:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients',
        method: 'GET',
        operation: 'list-developer-clients',
      },
      extra: { userId: session?.user?.id },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to POST /api/developer/clients',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/developer/clients', method: 'POST' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    const body = await req.json();

    // Validate with the schema but override tier and email
    const validation = validateRequest(
      CreateApiClientSchema.pick({ name: true }),
      { name: body.name },
    );

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

    // Enforce client limit
    const existingClients = await listApiClientsByUserId(session.user.id);
    if (existingClients.length >= MAX_CLIENTS_PER_USER) {
      return NextResponse.json(
        createErrorResponse(
          `Maximum of ${MAX_CLIENTS_PER_USER} API clients allowed per user`,
          'LIMIT_EXCEEDED',
        ),
        { status: 400 },
      );
    }

    const client = await createApiClient({
      name: validation.data!.name,
      tier: 'basic',
      contactEmail: session.user.email!,
      userId: session.user.id,
    });

    if (!client) {
      return NextResponse.json(
        createErrorResponse('Failed to create API client', 'INTERNAL_ERROR'),
        { status: 500 },
      );
    }

    return NextResponse.json(
      createSuccessResponse(client, 'API client created successfully'),
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating developer client:', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/developer/clients',
        method: 'POST',
        operation: 'create-developer-client',
      },
      extra: { userId: session?.user?.id },
      level: 'error',
    });
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 },
    );
  }
}
