'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import CalendarView from '@/components/CalendarView';

export default function Home() {
  const { data: session } = useSession();

  // Handle authentication errors by automatically signing out
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      console.warn('Authentication token expired. Signing out automatically.');
      signOut({ callbackUrl: '/' });
    }
  }, [session]);

  return (
    <div className='h-screen bg-gray-50 dark:bg-gray-800 flex flex-col mobile-viewport-container'>
      <main className='flex-1 flex flex-col'>
        <CalendarView />
      </main>
    </div>
  );
}
