'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface GcalSyncState {
  enabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useGcalSync() {
  const { data: session } = useSession();
  const [syncState, setSyncState] = useState<GcalSyncState>({
    enabled: true, // Default value
    isLoading: true,
    error: null,
  });

  // Prevent duplicate calls in Strict Mode
  const fetchingRef = useRef(false);

  // Fetch current sync preference
  useEffect(() => {
    if (!session?.user?.id) {
      setSyncState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchSyncPreference = async () => {
      // Prevent concurrent calls
      if (fetchingRef.current) {
        return;
      }

      try {
        fetchingRef.current = true;
        setSyncState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch('/api/user/gcal-sync');
        if (!response.ok) {
          throw new Error('Failed to fetch sync preference');
        }

        const data = await response.json();
        setSyncState({
          enabled: data.data?.enabled ?? true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching sync preference:', error);
        setSyncState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchSyncPreference();
  }, [session?.user?.id]);

  // Update sync preference
  const updateSyncPreference = async (enabled: boolean) => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setSyncState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/user/gcal-sync', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sync preference');
      }

      setSyncState({
        enabled,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error updating sync preference:', error);
      setSyncState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  return {
    syncEnabled: syncState.enabled,
    isLoading: syncState.isLoading,
    error: syncState.error,
    updateSyncPreference,
  };
}
