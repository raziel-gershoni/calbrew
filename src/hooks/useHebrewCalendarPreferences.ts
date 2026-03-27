'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  HebrewCalendarPreferences,
  DEFAULT_HEBREW_CALENDAR_PREFERENCES,
} from '@/types/hebrewEventPreferences';
import * as SentryHelper from '@/lib/logger/sentry';

const LS_KEY = 'calbrew-hebrew-calendar-preferences';

export function useHebrewCalendarPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<HebrewCalendarPreferences>(
    DEFAULT_HEBREW_CALENDAR_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from localStorage, then optionally from API
  useEffect(() => {
    // Read from localStorage first
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }

    // Only fetch from API if authenticated
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchHebrewCalendarPreferences = async () => {
      try {
        const response = await fetch('/api/user/hebrew-calendar-preferences');
        if (response.ok) {
          const result = await response.json();
          const serverPrefs =
            result.data?.hebrewCalendarPreferences ||
            DEFAULT_HEBREW_CALENDAR_PREFERENCES;
          setPreferences(serverPrefs);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(serverPrefs));
          } catch {
            // Ignore localStorage errors
          }
        } else {
          console.warn(
            'Failed to load Hebrew calendar preferences, using default',
          );
        }
      } catch (error) {
        console.error('Error loading Hebrew calendar preferences:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useHebrewCalendarPreferences',
            operation: 'fetch-hebrew-calendar-preferences',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHebrewCalendarPreferences();
  }, [session?.user?.id]);

  // Listen for Hebrew calendar preference changes from other components
  useEffect(() => {
    const handleHebrewCalendarPreferencesChange = (event: CustomEvent) => {
      setPreferences(event.detail.preferences);
    };

    window.addEventListener(
      'hebrewCalendarPreferencesChanged',
      handleHebrewCalendarPreferencesChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'hebrewCalendarPreferencesChanged',
        handleHebrewCalendarPreferencesChange as EventListener,
      );
    };
  }, []);

  // Save individual preference to localStorage and optionally to database
  const updatePreference = async (
    key: keyof HebrewCalendarPreferences,
    value: boolean,
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // Always persist to localStorage
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newPreferences));
    } catch {
      // Ignore localStorage errors
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent('hebrewCalendarPreferencesChanged', {
        detail: { preferences: newPreferences },
      }),
    );

    // Only save to API if authenticated
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/hebrew-calendar-preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hebrewCalendarPreferences: newPreferences }),
        });

        if (!response.ok) {
          throw new Error('Failed to update Hebrew calendar preference');
        }
      } catch (error) {
        console.error('Failed to update Hebrew calendar preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useHebrewCalendarPreferences',
            operation: 'update-hebrew-calendar-preference',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    preferences,
    isLoading,
    updatePreference,
  };
}
