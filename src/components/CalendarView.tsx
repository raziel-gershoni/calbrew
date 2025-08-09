'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/he';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import CustomToolbar from './CustomToolbar';
import { HDate, gematriya } from '@hebcal/core';
import EventForm from './EventForm';
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import CalendarHeader from './CalendarHeader';
import LoadingSpinner from './LoadingSpinner';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import {
  generateEventOccurrences,
  EventOccurrence,
} from '@/utils/hebrewDateUtils';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const {
    events: masterEvents,
    isLoading,
    isCreating,
    isSaving,
    isDeleting,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [date, setDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport changes and force calendar re-initialization when needed
  useEffect(() => {
    const checkViewport = () => {
      const newIsMobile = window.innerWidth < 768; // md breakpoint
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        // Force calendar re-render to fix event listener initialization
        setCalendarKey((prev) => prev + 1);
      }
    };

    // Check initial viewport
    checkViewport();

    // Listen for viewport changes
    window.addEventListener('resize', checkViewport);

    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, [isMobile]);

  // Generate event occurrences when events or date changes
  useEffect(() => {
    const startOfMonth = moment(date).startOf('month').toDate();
    const endOfMonth = moment(date).endOf('month').toDate();

    const newOccurrences = generateEventOccurrences(
      masterEvents,
      startOfMonth,
      endOfMonth,
    );

    setOccurrences(newOccurrences);
  }, [masterEvents, date]);

  // Force calendar re-initialization after initial load to ensure mobile works
  useEffect(() => {
    if (!isLoading && masterEvents.length >= 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setCalendarKey((prev) => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isLoading, masterEvents.length]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setSelectedEvent(null);
  };

  // Fallback day selection handler for mobile
  const handleDaySelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
  }, []);

  const handleAddEvent = async (event: Omit<Event, 'id'>) => {
    const success = await createEvent(event);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleSelectEvent = (event: EventOccurrence) => {
    setSelectedEvent(event);
    setSelectedDate(event.start);
  };

  const handleDeleteEvent = async (id: string) => {
    const success = await deleteEvent(id);
    if (success) {
      setSelectedEvent(null);
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const success = await updateEvent(event);
    if (success && selectedEvent) {
      setSelectedEvent({ ...selectedEvent, ...event });
    }
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const dayPropGetter = (date: Date) => {
    if (selectedDate && moment(date).isSame(selectedDate, 'day')) {
      return {
        style: {
          backgroundColor: '#3b82f6',
          color: 'white',
        },
      };
    }
    return {};
  };

  // Memoize expensive calculations
  const dayEvents = useMemo(
    () =>
      occurrences.filter((event) =>
        moment(event.start).isSame(selectedDate, 'day'),
      ),
    [occurrences, selectedDate],
  );

  // Memoize calendar messages to avoid recreation on every render
  const calendarMessages = useMemo(
    () => ({
      previous: '→',
      next: '←',
      today: t('Today'),
      month: t('Month'),
      week: t('Week'),
      day: t('Day'),
      agenda: t('Agenda'),
      date: t('Date'),
      time: t('Time'),
      event: t('Event'),
      showMore: (total: number) => `+${total} ${t('more')}`,
    }),
    [t],
  );

  // Show loading spinner while initial data loads
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <CalendarHeader />
      <Calendar
        key={calendarKey}
        localizer={localizer}
        events={occurrences}
        startAccessor='start'
        endAccessor='end'
        style={{ height: 500 }}
        rtl={i18n.language === 'he'}
        selectable={true}
        date={date}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        messages={calendarMessages}
        dayPropGetter={dayPropGetter}
        components={{
          toolbar: CustomToolbar,
          month: {
            dateHeader: ({ date, label }) => {
              const hdate = new HDate(date);
              const isSelected =
                selectedDate && moment(date).isSame(selectedDate, 'day');

              // Mobile-only click handler
              const handleMobileClick = (
                e: React.MouseEvent | React.TouchEvent,
              ) => {
                // Only handle clicks on mobile (touch devices)
                if (isMobile) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDaySelect(date);
                }
              };

              return (
                <div
                  className={`flex flex-col items-center w-full h-full ${
                    isMobile ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'manipulation',
                    // On desktop, let day background handle clicks
                    pointerEvents: isMobile ? 'auto' : 'none',
                  }}
                  onClick={handleMobileClick}
                  onTouchEnd={handleMobileClick}
                >
                  <span>{label}</span>
                  <span
                    className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}
                  >
                    {gematriya(hdate.getDate())}
                  </span>
                </div>
              );
            },
            event: ({ event }) => {
              // Custom event component that doesn't interfere with day selection
              return (
                <div
                  className='rbc-event-content'
                  title={event.title}
                  style={{ position: 'relative', zIndex: 2 }}
                >
                  {event.title}
                </div>
              );
            },
          },
        }}
      />
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ${i18n.language === 'he' ? 'md:grid-flow-col-dense' : ''}`}
      >
        <DayEvents
          events={dayEvents}
          onSelectEvent={handleSelectEvent}
          onAddEvent={() => setIsModalOpen(true)}
          selectedDate={selectedDate}
        />
        <EventDetails
          event={selectedEvent}
          onDelete={handleDeleteEvent}
          onSave={handleSaveEvent}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      </div>
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center'>
          <div className='bg-white p-4 rounded-lg'>
            <EventForm
              onAddEvent={handleAddEvent}
              isCreating={isCreating}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className='mt-4 bg-red-500 text-white p-2 rounded-md'
            >
              {t('Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
