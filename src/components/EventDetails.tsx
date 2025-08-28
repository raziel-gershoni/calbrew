'use client';

import { useState, useEffect, useRef } from 'react';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';

interface EventDetailsProps {
  event: Event | null;
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
          <h2 className='text-2xl font-bold mb-2'>{event.title}</h2>
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
                <svg
                  className='w-3 h-3 me-1'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                {t('Synced with Google Calendar')}
              </span>
            ) : (
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-300'>
                <svg
                  className='w-3 h-3 me-1'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
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
                    <svg
                      className='w-4 h-4 me-1'
                      fill='none'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                    </svg>
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
