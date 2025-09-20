'use client';

import { useState, useEffect } from 'react';
import {
  DailyLearningPreferences,
  DEFAULT_DAILY_LEARNING_PREFERENCES,
} from '@/types/hebrewEventPreferences';

export function useDailyLearningPreferences() {
  const [preferences, setPreferences] = useState<DailyLearningPreferences>(
    DEFAULT_DAILY_LEARNING_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preferences from database on mount
  useEffect(() => {
    const fetchDailyLearningPreferences = async () => {
      try {
        const response = await fetch('/api/user/daily-learning-preferences');
        if (response.ok) {
          const result = await response.json();
          setPreferences(
            result.data?.dailyLearningPreferences ||
              DEFAULT_DAILY_LEARNING_PREFERENCES,
          );
        } else {
          console.warn(
            'Failed to load daily learning preferences, using default',
          );
        }
      } catch (error) {
        console.error('Error loading daily learning preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyLearningPreferences();

    // Listen for daily learning preference changes from other components
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

  // Save individual preference to database
  const updatePreference = async (
    key: keyof DailyLearningPreferences,
    value: boolean,
  ) => {
    setIsLoading(true);
    try {
      const newPreferences = { ...preferences, [key]: value };

      const response = await fetch('/api/user/daily-learning-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dailyLearningPreferences: newPreferences }),
      });

      if (response.ok) {
        setPreferences(newPreferences);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('dailyLearningPreferencesChanged', {
            detail: { preferences: newPreferences },
          }),
        );
      } else {
        throw new Error('Failed to update daily learning preference');
      }
    } catch (error) {
      console.error('Failed to update daily learning preference:', error);
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
