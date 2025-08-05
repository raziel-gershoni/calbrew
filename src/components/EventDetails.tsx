'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';

interface EventDetailsProps {
  event: Event | null;
  onDelete: (id: string) => void;
  onSave: (event: Event) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
}

export default function EventDetails({
  event,
  onDelete,
  onSave,
  isSaving,
  isDeleting,
}: EventDetailsProps) {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);

  useEffect(() => {
    setEditedEvent(event);
    if (event === null) {
      setIsEditing(false);
    }
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

  return (
    <div
      className={`bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
    >
      {isEditing ? (
        <div>
          <input
            type='text'
            value={editedEvent?.title || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, title: e.target.value })
            }
            className={`w-full p-2 mb-2 border rounded-md ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
          />
          <textarea
            value={editedEvent?.description || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, description: e.target.value })
            }
            className={`w-full p-2 mb-2 border rounded-md ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
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
          <div className='flex gap-2 justify-start'>
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
          </div>
        </div>
      )}
    </div>
  );
}
