'use client';

import { useState, useEffect, useRef } from 'react';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { formatEventTitle, EventOccurrence } from '@/utils/hebrewDateUtils';

interface EventDetailsProps {
  event: EventOccurrence | null;
  onDelete: (id: string) => void;
  onSave: (event: Event) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
  onSync?: (id: string) => Promise<void>;
}

export default function EventDetails({
  event,
  onDelete,
  onSave,
  isSaving,
  isDeleting,
  onSync,
}: EventDetailsProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const [isEventSynced, setIsEventSynced] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Prevent duplicate calls in Strict Mode
  const fetchingRef = useRef(false);

  useEffect(() => {
    setEditedEvent(event);
    if (event === null) {
      setIsEditing(false);
      setIsEventSynced(null);
    }
  }, [event]);

  // Check sync status when event changes
  useEffect(() => {
    if (!event) {
      setIsEventSynced(null);
      return;
    }

    const checkSyncStatus = async () => {
      // Prevent concurrent calls
      if (fetchingRef.current) {
        return;
      }

      try {
        fetchingRef.current = true;
        const response = await fetch(`/api/events/${event.id}/sync-status`);
        if (response.ok) {
          const data = await response.json();
          setIsEventSynced(data.data?.synced || false);
        } else {
          console.error('Failed to fetch sync status');
          setIsEventSynced(false);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
        setIsEventSynced(false);
      } finally {
        fetchingRef.current = false;
      }
    };

    checkSyncStatus();
  }, [event]);

  if (!event) {
    return (
      <div className='bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4'>
        <p>{t('Select an event to see the details')}</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (editedEvent) {
      await onSave(editedEvent);
      setIsEditing(false);
    }
  };

  const handleSync = async () => {
    if (!event || !onSync) {
      return;
    }

    setIsSyncing(true);
    try {
      await onSync(event.id);
      setIsEventSynced(true); // Update local state
    } catch (error) {
      console.error('Error syncing event:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4 text-start`}
    >
      {isEditing ? (
        <div>
          <input
            type='text'
            value={editedEvent?.title || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, title: e.target.value })
            }
            className={`w-full p-2 mb-2 border rounded-md text-start`}
          />
          <textarea
            value={editedEvent?.description || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, description: e.target.value })
            }
            className={`w-full p-2 mb-2 border rounded-md text-start`}
          />
          <div className='flex gap-2 justify-start'>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className='bg-green-500 text-white p-2 rounded-md disabled:bg-green-400'
            >
              {isSaving ? t('Saving...') : t('Save')}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className='bg-gray-500 text-white p-2 rounded-md disabled:bg-gray-400'
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className='text-2xl font-bold mb-2'>
            {formatEventTitle(event.title, event.anniversary || 0)}
          </h2>
          <p className='mb-4'>{event.description}</p>

          {/* Sync Status Indicator */}
          <div className='mb-4'>
            {isEventSynced === null ? (
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'>
                <svg
                  className='w-3 h-3 me-1 animate-spin'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                {t('Checking sync status...')}
              </span>
            ) : isEventSynced ? (
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-300'>
                <CheckIcon className='w-3 h-3 me-1' />
                {t('Synced with Google Calendar')}
              </span>
            ) : (
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-300'>
                <ExclamationTriangleIcon className='w-3 h-3 me-1' />
                {t('Not synced with Google Calendar')}
              </span>
            )}
          </div>

          <div className='flex gap-2 justify-start flex-wrap'>
            <button
              onClick={() => setIsEditing(true)}
              className='bg-blue-500 text-white p-2 rounded-md'
            >
              {t('Edit')}
            </button>
            <button
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
              className='bg-red-500 text-white p-2 rounded-md disabled:bg-red-400'
            >
              {isDeleting ? t('Deleting...') : t('Delete')}
            </button>

            {/* Sync Button - only show for unsynced events */}
            {isEventSynced === false && onSync && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className='bg-green-500 text-white p-2 rounded-md disabled:bg-green-400 flex items-center'
              >
                {isSyncing ? (
                  <>
                    <svg
                      className='w-4 h-4 me-1 animate-spin'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    {t('Syncing...')}
                  </>
                ) : (
                  <>
                    <CalendarIcon className='w-4 h-4 me-1' />
                    {t('Start syncing with Google Calendar')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
