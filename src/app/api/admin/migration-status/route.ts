import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMigrationStatus } from '@/lib/migrations';
import * as SentryHelper from '@/lib/logger/sentry';

export async function GET(): Promise<Response> {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      SentryHelper.addBreadcrumb({
        message:
          'Unauthorized access attempt to GET /api/admin/migration-status',
        category: 'auth',
        level: 'info',
        data: { endpoint: '/api/admin/migration-status', method: 'GET' },
      });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // In a production app, you might want to restrict this to admin users only
    // For now, any authenticated user can check migration status

    const migrations = await getMigrationStatus();

    return NextResponse.json({
      migrations,
      count: migrations.length,
      latest: migrations[migrations.length - 1] || null,
    });
  } catch (error) {
    console.error('Error getting migration status:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/admin/migration-status',
        method: 'GET',
        operation: 'get-migration-status',
      },
      extra: {
        userId: session?.user?.id,
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
