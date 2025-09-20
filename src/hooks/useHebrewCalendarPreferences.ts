'use client';

import { useState, useEffect } from 'react';
import {
  HebrewCalendarPreferences,
  DEFAULT_HEBREW_CALENDAR_PREFERENCES,
} from '@/types/hebrewEventPreferences';

export function useHebrewCalendarPreferences() {
  const [preferences, setPreferences] = useState<HebrewCalendarPreferences>(
    DEFAULT_HEBREW_CALENDAR_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from database on mount
  useEffect(() => {
    const fetchHebrewCalendarPreferences = async () => {
      try {
        const response = await fetch('/api/user/hebrew-calendar-preferences');
        if (response.ok) {
          const result = await response.json();
          setPreferences(
            result.data?.hebrewCalendarPreferences ||
              DEFAULT_HEBREW_CALENDAR_PREFERENCES,
          );
        } else {
          console.warn(
            'Failed to load Hebrew calendar preferences, using default',
          );
        }
      } catch (error) {
        console.error('Error loading Hebrew calendar preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHebrewCalendarPreferences();

    // Listen for Hebrew calendar preference changes from other components
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

  // Save individual preference to database
  const updatePreference = async (
    key: keyof HebrewCalendarPreferences,
    value: boolean,
  ) => {
    setIsLoading(true);
    try {
      const newPreferences = { ...preferences, [key]: value };

      const response = await fetch('/api/user/hebrew-calendar-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hebrewCalendarPreferences: newPreferences }),
      });

      if (response.ok) {
        setPreferences(newPreferences);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('hebrewCalendarPreferencesChanged', {
            detail: { preferences: newPreferences },
          }),
        );
      } else {
        throw new Error('Failed to update Hebrew calendar preference');
      }
    } catch (error) {
      console.error('Failed to update Hebrew calendar preference:', error);
      // TODO: Show error toast to user
    } finally {
      setIsLoading(false);
    }
  };

  return {
    preferences,
    isLoading,
    updatePreference,
  };
}
