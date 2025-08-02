'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types/event';

interface EventDetailsProps {
  event: Event | null;
  onDelete: (id: string) => void;
  onSave: (event: Event) => void;
}

export default function EventDetails({
  event,
  onDelete,
  onSave,
}: EventDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);

  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  if (!event) {
    return (
      <div className='bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4'>
        <p>Select an event to see the details</p>
      </div>
    );
  }

  const handleSave = () => {
    if (editedEvent) {
      onSave(editedEvent);
      setIsEditing(false);
    }
  };

  return (
    <div className='bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4'>
      {isEditing ? (
        <div>
          <input
            type='text'
            value={editedEvent?.title || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, title: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded-md'
          />
          <textarea
            value={editedEvent?.description || ''}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent!, description: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded-md'
          />
          <button
            onClick={handleSave}
            className='bg-green-500 text-white p-2 rounded-md'
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className='ml-2 bg-gray-500 text-white p-2 rounded-md'
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <h2 className='text-2xl font-bold mb-2'>{event.title}</h2>
          <p className='mb-4'>{event.description}</p>
          <button
            onClick={() => setIsEditing(true)}
            className='bg-blue-500 text-white p-2 rounded-md'
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className='ml-2 bg-red-500 text-white p-2 rounded-md'
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
