import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/postgres';

interface UserCalendarInfo {
  calbrew_calendar_id: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query<UserCalendarInfo>(
      'SELECT calbrew_calendar_id FROM users WHERE id = $1',
      [session.user.id],
    );

    const userInfo = result.rows[0];

    return NextResponse.json({
      calbrew_calendar_id: userInfo?.calbrew_calendar_id || null,
    });
  } catch (error) {
    console.error('Failed to fetch user calendar info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar information' },
      { status: 500 },
    );
  }
}
