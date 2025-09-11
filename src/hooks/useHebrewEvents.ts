'use client';

import { useState, useEffect } from 'react';

export function useHebrewEvents() {
  const [showHebrewEvents, setShowHebrewEvents] = useState<boolean>(true); // Default to true
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preference from database on mount
  useEffect(() => {
    const fetchHebrewEventsPreference = async () => {
      try {
        const response = await fetch('/api/user/hebrew-events');
        if (response.ok) {
          const data = await response.json();
          setShowHebrewEvents(data.hebrewEventsEnabled);
        } else {
          console.warn(
            'Failed to load Hebrew events preference, using default',
          );
        }
      } catch (error) {
        console.error('Error loading Hebrew events preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHebrewEventsPreference();

    // Listen for Hebrew events preference changes from other components
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

  // Save preference to database
  const updateShowHebrewEvents = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/hebrew-events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hebrewEventsEnabled: enabled }),
      });

      if (response.ok) {
        setShowHebrewEvents(enabled);

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('hebrewEventsChanged', {
            detail: { enabled },
          }),
        );
      } else {
        throw new Error('Failed to update Hebrew events preference');
      }
    } catch (error) {
      console.error('Failed to update Hebrew events preference:', error);
      // TODO: Show error toast to user
    } finally {
      setIsLoading(false);
    }
  };

  return {
    showHebrewEvents,
    isLoading,
    updateShowHebrewEvents,
  };
}
