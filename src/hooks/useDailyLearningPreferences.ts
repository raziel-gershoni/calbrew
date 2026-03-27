'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  DailyLearningPreferences,
  DEFAULT_DAILY_LEARNING_PREFERENCES,
} from '@/types/hebrewEventPreferences';
import * as SentryHelper from '@/lib/logger/sentry';

const LS_KEY = 'calbrew-daily-learning-preferences';

export function useDailyLearningPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<DailyLearningPreferences>(
    DEFAULT_DAILY_LEARNING_PREFERENCES,
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

    const fetchDailyLearningPreferences = async () => {
      try {
        const response = await fetch('/api/user/daily-learning-preferences');
        if (response.ok) {
          const result = await response.json();
          const serverPrefs =
            result.data?.dailyLearningPreferences ||
            DEFAULT_DAILY_LEARNING_PREFERENCES;
          setPreferences(serverPrefs);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(serverPrefs));
          } catch {
            // Ignore localStorage errors
          }
        } else {
          console.warn(
            'Failed to load daily learning preferences, using default',
          );
        }
      } catch (error) {
        console.error('Error loading daily learning preferences:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useDailyLearningPreferences',
            operation: 'fetch-daily-learning-preferences',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyLearningPreferences();
  }, [session?.user?.id]);

  // Listen for daily learning preference changes from other components
  useEffect(() => {
    const handleDailyLearningPreferencesChange = (event: CustomEvent) => {
      setPreferences(event.detail.preferences);
    };

    window.addEventListener(
      'dailyLearningPreferencesChanged',
      handleDailyLearningPreferencesChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'dailyLearningPreferencesChanged',
        handleDailyLearningPreferencesChange as EventListener,
      );
    };
  }, []);

  // Save individual preference to localStorage and optionally to database
  const updatePreference = async (
    key: keyof DailyLearningPreferences,
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
      new CustomEvent('dailyLearningPreferencesChanged', {
        detail: { preferences: newPreferences },
      }),
    );

    // Only save to API if authenticated
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/daily-learning-preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dailyLearningPreferences: newPreferences }),
        });

        if (!response.ok) {
          throw new Error('Failed to update daily learning preference');
        }
      } catch (error) {
        console.error('Failed to update daily learning preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useDailyLearningPreferences',
            operation: 'update-daily-learning-preference',
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
