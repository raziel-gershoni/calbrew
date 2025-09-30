/**
 * Event Year Progression Component
 * Shows year progression status for a specific event
 */

import React, { useState, useEffect } from 'react';
import {
  useYearProgression,
  YearProgressionStatus,
} from '@/hooks/useYearProgression';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface EventYearProgressionProps {
  eventId: string;
  compact?: boolean;
}

export default function EventYearProgression({
  eventId,
  compact = false,
}: EventYearProgressionProps) {
  const { t } = useTranslation();
  const { checkEventYearProgression, syncEventNewYears } = useYearProgression();
  const [status, setStatus] = useState<YearProgressionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check status on mount
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await checkEventYearProgression(eventId);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const success = await syncEventNewYears(eventId);
      if (success) {
        // Refresh status after sync
        await checkStatus();
      } else {
        setError(t('Failed to sync years'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'}`}
      >
        <ArrowPathIcon
          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin text-blue-500`}
        />
        <span
          className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300`}
        >
          {t('Checking year progression...')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg'}`}
      >
        <ExclamationTriangleIcon
          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-red-500`}
        />
        <span
          className={`${compact ? 'text-xs' : 'text-sm'} text-red-600 dark:text-red-300`}
        >
          {error}
        </span>
        <button
          onClick={checkStatus}
          className={`${compact ? 'text-xs' : 'text-sm'} text-red-600 dark:text-red-300 hover:underline`}
        >
          {t('Try again')}
        </button>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // If event is up to date
  if (!status.needsUpdate) {
    if (compact) {
      return (
        <div className='flex items-center space-x-1'>
          <CheckCircleIcon className='w-4 h-4 text-green-500' />
          <span className='text-xs text-green-600 dark:text-green-400'>
            {t('Event is up to date')}
          </span>
        </div>
      );
    }

    return (
      <div className='flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
        <CheckCircleIcon className='w-5 h-5 text-green-500' />
        <span className='text-sm text-green-800 dark:text-green-300'>
          {t('Event is up to date')}
        </span>
      </div>
    );
  }

  // Event needs updates
  const yearsText = status.yearsNeedingSync.join(', ');

  if (compact) {
    return (
      <div className='flex items-center justify-between space-x-2'>
        <div className='flex items-center space-x-1'>
          <ExclamationTriangleIcon className='w-4 h-4 text-yellow-500' />
          <span className='text-xs text-yellow-600 dark:text-yellow-400'>
            {t('New years available: {{years}}', { years: yearsText })}
          </span>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className='text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-2 py-1 rounded'
        >
          {isSyncing ? t('Syncing...') : t('Sync')}
        </button>
      </div>
    );
  }

  return (
    <div className='p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800'>
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-start space-x-3'>
          <ExclamationTriangleIcon className='w-5 h-5 text-yellow-500 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
              {t('New years available: {{years}}', { years: yearsText })}
            </p>
            <p className='text-xs text-yellow-600 dark:text-yellow-400 mt-1'>
              {t('{{count}} events need year progression updates', {
                count: status.yearsNeedingSync.length,
              })}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSync}
        disabled={isSyncing}
        className='w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2'
      >
        {isSyncing ? (
          <>
            <ArrowPathIcon className='w-4 h-4 animate-spin' />
            <span>{t('Syncing...')}</span>
          </>
        ) : (
          <>
            <CalendarDaysIcon className='w-4 h-4' />
            <span>{t('Sync new years')}</span>
          </>
        )}
      </button>
    </div>
  );
}
