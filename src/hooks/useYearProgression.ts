/**
 * Hook for managing year progression
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/contexts/NotificationContext';

export interface YearProgressionStatus {
  eventId: string;
  title: string;
  hebrewYear: number;
  lastSyncedYear: number;
  currentYear: number;
  yearsNeedingSync: number[];
  needsUpdate: boolean;
}

export interface YearProgressionSummary {
  totalEvents: number;
  eventsNeedingUpdate: number;
  eventsUpToDate: number;
  lastChecked: Date;
}

export interface YearProgressionResult {
  totalEvents: number;
  eventsNeedingUpdate: number;
  eventsUpdated: number;
  eventsFailed: number;
  errors: string[];
  updatedEvents: YearProgressionStatus[];
}

export function useYearProgression() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const notifications = useNotifications();
  const [summary, setSummary] = useState<YearProgressionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch year progression summary
  const fetchSummary = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/year-progression');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to fetch year progression summary',
        );
      }

      setSummary(data.data);
    } catch (err) {
      console.error('Error fetching year progression summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Process year progression for all events
  const processYearProgression =
    useCallback(async (): Promise<YearProgressionResult | null> => {
      if (!session?.user?.id) {
        return null;
      }

      try {
        setIsProcessing(true);
        setError(null);

        const response = await fetch('/api/year-progression', {
          method: 'POST',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process year progression');
        }

        // Refresh summary after processing
        await fetchSummary();

        // Show success notification
        if (data.data.eventsUpdated > 0) {
          notifications.success(
            t('Years synced successfully'),
            t('{{count}} events updated with new years', {
              count: data.data.eventsUpdated,
            }),
          );
        } else if (data.data.eventsNeedingUpdate === 0) {
          notifications.info(
            t('All events are up to date'),
            t('No year progression updates needed'),
          );
        }

        return data.data;
      } catch (err) {
        console.error('Error processing year progression:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setIsProcessing(false);
      }
    }, [session?.user?.id, fetchSummary, notifications, t]);

  // Check year progression for specific event
  const checkEventYearProgression = useCallback(
    async (eventId: string): Promise<YearProgressionStatus | null> => {
      if (!session?.user?.id) {
        return null;
      }

      try {
        const response = await fetch(`/api/year-progression/${eventId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to check event year progression',
          );
        }

        return data.data;
      } catch (err) {
        console.error('Error checking event year progression:', err);
        return null;
      }
    },
    [session?.user?.id],
  );

  // Sync new years for specific event
  const syncEventNewYears = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!session?.user?.id) {
        return false;
      }

      try {
        const response = await fetch(`/api/year-progression/${eventId}`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to sync event new years');
        }

        // Refresh summary after syncing
        await fetchSummary();

        // Show success notification
        notifications.success(
          t('Years synced successfully'),
          t('Event years have been updated'),
        );

        return true;
      } catch (err) {
        console.error('Error syncing event new years:', err);
        return false;
      }
    },
    [session?.user?.id, fetchSummary, notifications, t],
  );

  // Auto-fetch summary on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchSummary();
    }
  }, [session?.user?.id, fetchSummary]);

  return {
    summary,
    isLoading,
    isProcessing,
    error,
    fetchSummary,
    processYearProgression,
    checkEventYearProgression,
    syncEventNewYears,
  };
}
