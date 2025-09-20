import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMigrationStatus } from '@/lib/migrations';

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
