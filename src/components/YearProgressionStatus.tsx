/**
 * Year Progression Status Component
 * Shows year progression status and allows manual sync
 */

import React from 'react';
import { useYearProgression } from '@/hooks/useYearProgression';
import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface YearProgressionStatusProps {
  onSyncComplete?: (result: {
    eventsUpdated: number;
    eventsFailed: number;
  }) => void;
  showDetails?: boolean;
}

export default function YearProgressionStatus({
  onSyncComplete,
  showDetails = false,
}: YearProgressionStatusProps) {
  const { t } = useTranslation();
  const {
    summary,
    isLoading,
    isProcessing,
    error,
    fetchSummary,
    processYearProgression,
  } = useYearProgression();

  const handleSyncAll = async () => {
    const result = await processYearProgression();
    if (result && onSyncComplete) {
      onSyncComplete(result);
    }
  };

  const handleRefresh = async () => {
    await fetchSummary();
  };

  if (isLoading) {
    return (
      <div className='bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600'>
        <div className='flex items-center space-x-3'>
          <ArrowPathIcon className='w-5 h-5 animate-spin text-blue-500' />
          <span className='text-gray-600 dark:text-gray-300'>
            {t('Checking year progression...')}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 rounded-lg p-4 shadow-sm border border-red-200 dark:border-red-800'>
        <div className='flex items-center space-x-3'>
          <ExclamationTriangleIcon className='w-5 h-5 text-red-500' />
          <div>
            <p className='text-red-800 dark:text-red-200 font-medium'>
              {t('Error checking year progression')}
            </p>
            <p className='text-red-600 dark:text-red-300 text-sm mt-1'>
              {error}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className='mt-3 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 underline'
        >
          {t('Try again')}
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const needsUpdate = summary.eventsNeedingUpdate > 0;
  const allUpToDate =
    summary.eventsUpToDate === summary.totalEvents && summary.totalEvents > 0;

  return (
    <div className='bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          <CalendarDaysIcon className='w-5 h-5 text-blue-500' />
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('Year Progression Status')}
          </h3>
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50'
            title={t('Refresh status')}
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className='space-y-3'>
        {/* Status Summary */}
        <div className='flex items-center space-x-3'>
          {allUpToDate ? (
            <CheckCircleIcon className='w-5 h-5 text-green-500' />
          ) : needsUpdate ? (
            <ExclamationTriangleIcon className='w-5 h-5 text-yellow-500' />
          ) : (
            <ClockIcon className='w-5 h-5 text-gray-400' />
          )}

          <div>
            <p className='text-gray-900 dark:text-gray-100'>
              {allUpToDate
                ? t('All events are up to date')
                : needsUpdate
                  ? t('{{count}} events need year progression updates', {
                      count: summary.eventsNeedingUpdate,
                    })
                  : t('No events found')}
            </p>

            {showDetails && (
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {t('{{total}} total events, {{upToDate}} up to date', {
                  total: summary.totalEvents,
                  upToDate: summary.eventsUpToDate,
                })}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {needsUpdate && (
          <div className='pt-2 border-t border-gray-200 dark:border-gray-600'>
            <button
              onClick={handleSyncAll}
              disabled={isProcessing}
              className='w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2'
            >
              {isProcessing ? (
                <>
                  <ArrowPathIcon className='w-4 h-4 animate-spin' />
                  <span>{t('Syncing...')}</span>
                </>
              ) : (
                <>
                  <CalendarDaysIcon className='w-4 h-4' />
                  <span>{t('Sync All Events')}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Last Checked */}
        {summary.lastChecked && (
          <p className='text-xs text-gray-400 dark:text-gray-500'>
            {t('Last checked: {{time}}', {
              time: new Date(summary.lastChecked).toLocaleString(),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
