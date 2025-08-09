'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { data: session } = useSession();
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // Use refs to prevent duplicate calls in Strict Mode
  const hasInitializedRef = useRef(false);
  const fetchingRef = useRef(false);

  // Fetch user's language preference on session load
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (session?.user?.id) {
      hasInitializedRef.current = true;
      fetchUserLanguage();
    } else if (session !== undefined) {
      // Wait for session to be determined
      hasInitializedRef.current = true;
      // If not logged in, use localStorage fallback
      const savedLanguage = localStorage.getItem('calbrew-language') || 'en';
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, [session?.user?.id, i18n]);

  const fetchUserLanguage = async () => {
    // Prevent concurrent calls
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      const response = await fetch('/api/user/language');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const userLanguage = result.data.language;
          if (i18n.language !== userLanguage) {
            i18n.changeLanguage(userLanguage);
          }
          // Also update localStorage as backup
          localStorage.setItem('calbrew-language', userLanguage);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user language:', error);
      // Fallback to localStorage
      const savedLanguage = localStorage.getItem('calbrew-language') || 'en';
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  const changeLanguage = async (newLanguage: 'en' | 'he') => {
    setIsLoading(true);

    try {
      // Update i18n immediately for responsive UI
      await i18n.changeLanguage(newLanguage);

      // Update localStorage as backup
      localStorage.setItem('calbrew-language', newLanguage);

      // If user is logged in, save to database
      if (session?.user?.id) {
        const response = await fetch('/api/user/language', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: newLanguage }),
        });

        if (!response.ok) {
          console.error('Failed to save language preference to database');
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentLanguage: i18n.language as 'en' | 'he',
    changeLanguage,
    isLoading,
  };
};
