'use client';

import { useState, useEffect } from 'react';

export function useDailyLearning() {
  const [showDailyLearning, setShowDailyLearning] = useState<boolean>(true); // Default to true
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preference from database on mount
  useEffect(() => {
    const fetchDailyLearningPreference = async () => {
      try {
        const response = await fetch('/api/user/daily-learning');
        if (response.ok) {
          const result = await response.json();
          setShowDailyLearning(result.data?.dailyLearningEnabled ?? true);
        } else {
          console.warn(
            'Failed to load daily learning preference, using default',
          );
        }
      } catch (error) {
        console.error('Error loading daily learning preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyLearningPreference();

    // Listen for daily learning preference changes from other components
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

  // Save preference to database
  const updateShowDailyLearning = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/daily-learning', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dailyLearningEnabled: enabled }),
      });

      if (response.ok) {
        setShowDailyLearning(enabled);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('dailyLearningChanged', {
            detail: { enabled },
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
    showDailyLearning,
    isLoading,
    updateShowDailyLearning,
  };
}
