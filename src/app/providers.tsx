'use client';

import { SessionProvider } from 'next-auth/react';
import { CalendarModeProvider } from '@/contexts/CalendarModeContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Automatically handle token refresh failures by signing user out
      refetchInterval={5 * 60} // Check token every 5 minutes
      refetchOnWindowFocus={true}
    >
      <CalendarModeProvider>{children}</CalendarModeProvider>
    </SessionProvider>
  );
}
