'use client';

import { useEffect, useState } from 'react';
import { initializeHebcalLocales } from '@/utils/hebrewMonthLocalization';

interface HebcalLocalesProviderProps {
  children: React.ReactNode;
}

export default function HebcalLocalesProvider({
  children,
}: HebcalLocalesProviderProps) {
  const [_localesLoaded, setLocalesLoaded] = useState(false);

  useEffect(() => {
    async function loadLocales() {
      try {
        await initializeHebcalLocales();
        setLocalesLoaded(true);
      } catch (error) {
        console.error('Failed to load Hebcal locales:', error);
        // Still render children even if locales fail to load
        setLocalesLoaded(true);
      }
    }

    loadLocales();
  }, []);

  // Always render children, don't block on locale loading
  return <>{children}</>;
}
