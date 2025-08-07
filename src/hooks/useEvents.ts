import { useState, useCallback, useEffect } from 'react';
import { Event } from '@/types/event';
import { useToast } from '@/components/Toast';
import { useTranslation } from 'react-i18next';

interface DeleteResponse {
  success: boolean;
  warning?: string;
}

interface UseEventsReturn {
  events: Event[];
  isLoading: boolean;
  isCreating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, 'id'>) => Promise<boolean>;
  updateEvent: (event: Event) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
}

export function useEvents(): UseEventsReturn {
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/events');
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      const data: Event[] = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError(t('Failed to load events. Please try refreshing the page.'));
    } finally {
      setIsLoading(false);
    }
  }, [showError, t]);

  // Automatically fetch events on mount
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  const createEvent = useCallback(
    async (event: Omit<Event, 'id'>): Promise<boolean> => {
      try {
        setIsCreating(true);
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!res.ok) {
          throw new Error(`Failed to create event: ${res.statusText}`);
        }

        // Refetch events after successful creation
        const refetchRes = await fetch('/api/events');
        if (refetchRes.ok) {
          const data: Event[] = await refetchRes.json();
          setEvents(data);
        }

        showSuccess(t('Event created successfully!'));
        return true;
      } catch (error) {
        console.error('Error creating event:', error);
        showError(t('Failed to create event. Please try again.'));
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [showError, showSuccess, t],
  );

  const updateEvent = useCallback(
    async (event: Event): Promise<boolean> => {
      try {
        setIsSaving(true);
        const res = await fetch(`/api/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!res.ok) {
          throw new Error(`Failed to save event: ${res.statusText}`);
        }

        // Refetch events after successful update
        const refetchRes = await fetch('/api/events');
        if (refetchRes.ok) {
          const data: Event[] = await refetchRes.json();
          setEvents(data);
        }

        showSuccess(t('Event saved successfully!'));
        return true;
      } catch (error) {
        console.error('Error saving event:', error);
        showError(t('Failed to save event. Please try again.'));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [showError, showSuccess, t],
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsDeleting(true);
        const res = await fetch(`/api/events/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error(`Failed to delete event: ${res.statusText}`);
        }

        const result: DeleteResponse = await res.json();

        // Refetch events after successful deletion
        const refetchRes = await fetch('/api/events');
        if (refetchRes.ok) {
          const data: Event[] = await refetchRes.json();
          setEvents(data);
        }

        if (result.warning) {
          showSuccess(`${t('Event deleted successfully!')} ${result.warning}`);
        } else {
          showSuccess(t('Event deleted successfully!'));
        }
        return true;
      } catch (error) {
        console.error('Error deleting event:', error);
        showError(t('Failed to delete event. Please try again.'));
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [showError, showSuccess, t],
  );

  return {
    events,
    isLoading,
    isCreating,
    isSaving,
    isDeleting,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
