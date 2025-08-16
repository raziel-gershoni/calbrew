'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import CalendarView from '@/components/CalendarView';

export default function Home() {
  const { data: session, status } = useSession();

  // Handle authentication errors by automatically signing out
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      console.warn('Authentication token expired. Signing out automatically.');
      signOut({ callbackUrl: '/' });
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900'>
        <div className='text-lg text-gray-800 dark:text-gray-200'>
          Loading...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className='flex flex-col justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900'>
        <h1 className='text-4xl font-bold mb-4 text-gray-800 dark:text-gray-200'>
          Welcome to Calbrew
        </h1>
        <p className='text-lg mb-8 text-gray-600 dark:text-gray-400'>
          Your Hebrew Calendar Event Manager
        </p>
        <button
          onClick={() => signIn('google')}
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg'
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className='h-screen bg-gray-50 dark:bg-gray-800 flex flex-col'>
      <main className='flex-1 flex flex-col'>
        <CalendarView />
      </main>
    </div>
  );
}
