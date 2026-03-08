import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/validation';
import { listAllApiClients } from '@/lib/api-auth';
import { isAdmin } from '@/lib/admin';
import * as SentryHelper from '@/lib/logger/sentry';

export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      SentryHelper.addBreadcrumb({
        message: 'Unauthorized access attempt to GET /api/admin/api-clients',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/admin/api-clients', method: 'GET' },
      });
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 },
      );
    }

    if (!isAdmin(session.user.email)) {
      SentryHelper.addBreadcrumb({
        message: 'Non-admin access attempt to GET /api/admin/api-clients',
        category: 'auth',
        level: 'warning',
        data: { endpoint: '/api/admin/api-clients', email: session.user.email },
      });
      return NextResponse.json(createErrorResponse('Forbidden', 'FORBIDDEN'), {
        status: 403,
      });
    }

    const clients = await listAllApiClients();
    return NextResponse.json(createSuccessResponse(clients));
  } catch (error) {
    console.error('Error listing all API clients (admin):', error);
    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/admin/api-clients',
        method: 'GET',
        operation: 'admin-list-clients',
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
