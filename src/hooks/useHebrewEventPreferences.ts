'use client';

import { useState, useEffect } from 'react';
import {
  HebrewEventPreferences,
  DEFAULT_HEBREW_EVENT_PREFERENCES,
} from '@/types/hebrewEventPreferences';

export function useHebrewEventPreferences() {
  const [preferences, setPreferences] = useState<HebrewEventPreferences>(
    DEFAULT_HEBREW_EVENT_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from database on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/user/hebrew-event-preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences || DEFAULT_HEBREW_EVENT_PREFERENCES);
        } else {
          console.warn(
            'Failed to load Hebrew event preferences, using defaults',
          );
          setPreferences(DEFAULT_HEBREW_EVENT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error loading Hebrew event preferences:', error);
        setPreferences(DEFAULT_HEBREW_EVENT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();

    // Listen for preference changes from other components
    const handlePreferencesChange = (event: CustomEvent) => {
      setPreferences(event.detail.preferences);
    };

    window.addEventListener(
      'hebrewEventPreferencesChanged',
      handlePreferencesChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        'hebrewEventPreferencesChanged',
        handlePreferencesChange as EventListener,
      );
    };
  }, []);

  // Save preferences to database
  const updatePreferences = async (
    newPreferences: Partial<HebrewEventPreferences>,
  ) => {
    const updatedPreferences = { ...preferences, ...newPreferences };

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/hebrew-event-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updatedPreferences }),
      });

      if (response.ok) {
        setPreferences(updatedPreferences);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('hebrewEventPreferencesChanged', {
            detail: { preferences: updatedPreferences },
          }),
        );
      } else {
        throw new Error('Failed to update Hebrew event preferences');
      }
    } catch (error) {
      console.error('Failed to update Hebrew event preferences:', error);
      // TODO: Show error toast to user
    } finally {
      setIsLoading(false);
    }
  };

  // Update single preference
  const updatePreference = async (
    key: keyof HebrewEventPreferences,
    value: boolean,
  ) => {
    await updatePreferences({ [key]: value });
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    await updatePreferences(DEFAULT_HEBREW_EVENT_PREFERENCES);
  };

  return {
    preferences,
    isLoading,
    updatePreferences,
    updatePreference,
    resetToDefaults,
  };
}
