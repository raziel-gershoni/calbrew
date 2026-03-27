'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as SentryHelper from '@/lib/logger/sentry';

const LS_KEY = 'calbrew-hebrew-events-enabled';

export function useHebrewEvents() {
  const { data: session } = useSession();
  const [showHebrewEvents, setShowHebrewEvents] = useState<boolean>(true); // Default to true
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preference from localStorage, then optionally from API
  useEffect(() => {
    // Read from localStorage first
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored !== null) {
        setShowHebrewEvents(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }

    // Only fetch from API if authenticated
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchHebrewEventsPreference = async () => {
      try {
        const response = await fetch('/api/user/hebrew-events');
        if (response.ok) {
          const data = await response.json();
          const serverVal = data.hebrewEventsEnabled;
          setShowHebrewEvents(serverVal);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(serverVal));
          } catch {
            // Ignore localStorage errors
          }
        } else {
          console.warn(
            'Failed to load Hebrew events preference, using default',
          );
        }
      } catch (error) {
        console.error('Error loading Hebrew events preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useHebrewEvents',
            operation: 'fetch-hebrew-events-preference',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHebrewEventsPreference();
  }, [session?.user?.id]);

  // Listen for Hebrew events preference changes from other components
  useEffect(() => {
    const handleHebrewEventsChange = (event: CustomEvent) => {
      setShowHebrewEvents(event.detail.enabled);
    };

    window.addEventListener(
      'hebrewEventsChanged',
      handleHebrewEventsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'hebrewEventsChanged',
        handleHebrewEventsChange as EventListener,
      );
    };
  }, []);

  // Save preference to localStorage and optionally to database
  const updateShowHebrewEvents = async (enabled: boolean) => {
    setShowHebrewEvents(enabled);

    // Always persist to localStorage
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(enabled));
    } catch {
      // Ignore localStorage errors
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent('hebrewEventsChanged', {
        detail: { enabled },
      }),
    );

    // Only save to API if authenticated
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/hebrew-events', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hebrewEventsEnabled: enabled }),
        });

        if (!response.ok) {
          throw new Error('Failed to update Hebrew events preference');
        }
      } catch (error) {
        console.error('Failed to update Hebrew events preference:', error);
        SentryHelper.captureException(error, {
          tags: {
            hook: 'useHebrewEvents',
            operation: 'update-hebrew-events-preference',
          },
          level: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    showHebrewEvents,
    isLoading,
    updateShowHebrewEvents,
  };
}
