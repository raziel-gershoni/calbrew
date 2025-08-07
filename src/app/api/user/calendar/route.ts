import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

interface UserCalendarInfo {
  calbrew_calendar_id: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userInfo = await new Promise<UserCalendarInfo | undefined>(
      (resolve, reject) => {
        db.get(
          'SELECT calbrew_calendar_id FROM users WHERE id = ?',
          [session.user.id],
          (err, row: UserCalendarInfo | undefined) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          },
        );
      },
    );

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
