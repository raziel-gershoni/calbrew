'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export type CalendarMode = 'hebrew' | 'gregorian';

export const useCalendarMode = () => {
  const { data: session } = useSession();
  const [calendarMode, setCalendarModeState] = useState<CalendarMode>('hebrew');
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging for state changes
  console.log(
    'useCalendarMode - Hook called, current calendarMode:',
    calendarMode,
  );

  // Use refs to prevent duplicate calls in Strict Mode
  const hasInitializedRef = useRef(false);
  const fetchingRef = useRef(false);

  // Track when calendarMode state changes
  useEffect(() => {
    console.log(
      'useCalendarMode - calendarMode state changed to:',
      calendarMode,
    );
  }, [calendarMode]);

  // Fetch user's calendar mode preference on session load
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    if (session?.user?.id) {
      hasInitializedRef.current = true;
      fetchUserCalendarMode();
    } else if (session !== undefined) {
      // Wait for session to be determined
      hasInitializedRef.current = true;
      // If not logged in, use localStorage fallback
      const savedMode =
        (localStorage.getItem('calbrew-calendar-mode') as CalendarMode) ||
        'hebrew';
      setCalendarModeState(savedMode);
    }
  }, [session?.user?.id]);

  const fetchUserCalendarMode = async () => {
    // Prevent concurrent calls
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      const response = await fetch('/api/user/calendar-mode');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const userCalendarMode = result.data.calendarMode as CalendarMode;
          setCalendarModeState(userCalendarMode);
          // Also update localStorage as backup
          localStorage.setItem('calbrew-calendar-mode', userCalendarMode);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user calendar mode:', error);
      // Fallback to localStorage
      const savedMode =
        (localStorage.getItem('calbrew-calendar-mode') as CalendarMode) ||
        'hebrew';
      setCalendarModeState(savedMode);
    } finally {
      fetchingRef.current = false;
    }
  };

  const setCalendarMode = async (newMode: CalendarMode) => {
    console.log(
      'useCalendarMode - setCalendarMode called with newMode:',
      newMode,
    );
    console.log(
      'useCalendarMode - current calendarMode before update:',
      calendarMode,
    );
    setIsLoading(true);

    try {
      // Update state immediately for responsive UI
      console.log(
        'useCalendarMode - calling setCalendarModeState with:',
        newMode,
      );
      setCalendarModeState(newMode);
      console.log('useCalendarMode - setCalendarModeState called successfully');

      // Update localStorage as backup
      localStorage.setItem('calbrew-calendar-mode', newMode);

      // If user is logged in, save to database
      if (session?.user?.id) {
        const response = await fetch('/api/user/calendar-mode', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ calendarMode: newMode }),
        });

        if (!response.ok) {
          console.error('Failed to save calendar mode preference to database');
        }
      }
    } catch (error) {
      console.error('Failed to change calendar mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    calendarMode,
    setCalendarMode,
    isLoading,
  };
};
