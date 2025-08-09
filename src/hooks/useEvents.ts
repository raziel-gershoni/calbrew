import { useState, useCallback, useEffect } from 'react';
import { Event } from '@/types/event';
import { useToast } from '@/components/Toast';
import { useTranslation } from 'react-i18next';
import { ApiResponse } from '@/lib/validation';

interface DeleteResponse {
  success: boolean;
  data?: {
    warning?: string;
  };
  warning?: string; // Legacy support
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
      const response: ApiResponse<Event[]> = await res.json();

      if (!res.ok) {
        if (response.success === false) {
          throw new Error(response.error);
        }
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }

      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setEvents([]);
      }
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

        const response: ApiResponse = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            // Show validation errors if available
            if (
              response.code === 'VALIDATION_ERROR' &&
              response.details &&
              Array.isArray(response.details)
            ) {
              const validationMessages = response.details
                .map((detail) => `${detail.field}: ${detail.message}`)
                .join(', ');
              showError(`${t('Validation error')}: ${validationMessages}`);
            } else {
              showError(response.error);
            }
          } else {
            throw new Error(`Failed to create event: ${res.statusText}`);
          }
          return false;
        }

        // Refetch events after successful creation
        await fetchEvents();

        const successMessage =
          response.success === true ? response.message : undefined;
        showSuccess(successMessage || t('Event created successfully!'));
        return true;
      } catch (error) {
        console.error('Error creating event:', error);
        showError(t('Failed to create event. Please try again.'));
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [showError, showSuccess, t, fetchEvents],
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

        const response: ApiResponse = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            // Show validation errors if available
            if (
              response.code === 'VALIDATION_ERROR' &&
              response.details &&
              Array.isArray(response.details)
            ) {
              const validationMessages = response.details
                .map((detail) => `${detail.field}: ${detail.message}`)
                .join(', ');
              showError(`${t('Validation error')}: ${validationMessages}`);
            } else {
              showError(response.error);
            }
          } else {
            throw new Error(`Failed to save event: ${res.statusText}`);
          }
          return false;
        }

        // Refetch events after successful update
        await fetchEvents();

        const successMessage =
          response.success === true ? response.message : undefined;
        showSuccess(successMessage || t('Event saved successfully!'));
        return true;
      } catch (error) {
        console.error('Error saving event:', error);
        showError(t('Failed to save event. Please try again.'));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [showError, showSuccess, t, fetchEvents],
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsDeleting(true);
        const res = await fetch(`/api/events/${id}`, {
          method: 'DELETE',
        });

        const response: ApiResponse<DeleteResponse> = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to delete event: ${res.statusText}`);
          }
          return false;
        }

        // Refetch events after successful deletion
        await fetchEvents();

        // Check for warnings in the new format or legacy format
        const warning =
          response.success === true ? response.data?.warning : undefined;
        const successMessage =
          response.success === true ? response.message : undefined;

        if (warning) {
          showSuccess(`${t('Event deleted successfully!')} ${warning}`);
        } else {
          showSuccess(successMessage || t('Event deleted successfully!'));
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
    [showError, showSuccess, t, fetchEvents],
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
