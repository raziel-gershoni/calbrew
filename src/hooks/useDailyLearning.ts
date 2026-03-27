'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as SentryHelper from '@/lib/logger/sentry';

const LS_KEY = 'calbrew-daily-learning-enabled';

export function useDailyLearning() {
  const { data: session } = useSession();
  const [showDailyLearning, setShowDailyLearning] = useState<boolean>(true); // Default to true
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preference from localStorage, then optionally from API
  useEffect(() => {
    // Read from localStorage first
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored !== null) {
        setShowDailyLearning(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }

    // Only fetch from API if authenticated
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchDailyLearningPreference = async () => {
      try {
        const response = await fetch('/api/user/daily-learning');
        if (response.ok) {
          const result = await response.json();
          const serverVal = result.data?.dailyLearningEnabled ?? true;
          setShowDailyLearning(serverVal);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(serverVal));
          } catch {
            // Ignore localStorage errors
          }
        } else {
          console.warn(
            'Failed to load daily learning preference, using default',
          );
        }
      } catch (error) {
        console.error('Error loading daily learning preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useDailyLearning',
            operation: 'fetch-daily-learning-preference',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyLearningPreference();
  }, [session?.user?.id]);

  // Listen for daily learning preference changes from other components
  useEffect(() => {
    const handleDailyLearningChange = (event: CustomEvent) => {
      setShowDailyLearning(event.detail.enabled);
    };

    window.addEventListener(
      'dailyLearningChanged',
      handleDailyLearningChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'dailyLearningChanged',
        handleDailyLearningChange as EventListener,
      );
    };
  }, []);

  // Save preference to localStorage and optionally to database
  const updateShowDailyLearning = async (enabled: boolean) => {
    setShowDailyLearning(enabled);

    // Always persist to localStorage
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(enabled));
    } catch {
      // Ignore localStorage errors
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent('dailyLearningChanged', {
        detail: { enabled },
      }),
    );

    // Only save to API if authenticated
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/daily-learning', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dailyLearningEnabled: enabled }),
        });

        if (!response.ok) {
          throw new Error('Failed to update daily learning preference');
        }
      } catch (error) {
        console.error('Failed to update daily learning preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useDailyLearning',
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
    showDailyLearning,
    isLoading,
    updateShowDailyLearning,
  };
}
