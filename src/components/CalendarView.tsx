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
import { useLanguage } from '@/hooks/useLanguage';
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
  const { changeLanguage, isLoading: isLanguageLoading } = useLanguage();

  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [date, setDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  // Separate touch detection from layout preferences
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(500);
  const [isMobileEventModalOpen, setIsMobileEventModalOpen] = useState(false);

  // Detect device capabilities and screen size
  useEffect(() => {
    const checkDevice = () => {
      // Detect touch capability (for day clicking)
      const hasTouchSupport =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Smart layout detection using multiple factors
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Use modal layout when:
      // 1. Very small screens (phones) - width < 640px
      // 2. Limited height regardless of width - height < 600px (landscape phones/tablets)
      // 3. Small total area (small devices) - area < 400,000 pixels
      const isVerySmallWidth = width < 640;
      const isLimitedHeight = height < 600;
      const isSmallArea = width * height < 400000; // ~632x632 equivalent

      const newIsSmallScreen =
        isVerySmallWidth || isLimitedHeight || isSmallArea;

      // Dynamic calendar height based on screen size and available space
      let newCalendarHeight = 500; // Default height for tablets/desktop

      if (width <= 375 && height <= 667) {
        // iPhone SE and similar very small devices (375x667)
        newCalendarHeight = 300;
      } else if (width <= 390 && height >= 800 && height < 900) {
        // iPhone 14, iPhone 13 mini, etc. (390x844, etc.)
        newCalendarHeight = 480;
      } else if (width <= 428 && height >= 900) {
        // iPhone 14 Pro Max, iPhone 15 Pro Max, etc. (430x932, 428x926) - utilize the huge screen
        newCalendarHeight = 550;
      } else if (width <= 414 && height >= 850) {
        // iPhone 13 Pro Max, iPhone 12 Pro Max, etc. (414x896)
        newCalendarHeight = 520;
      } else if (width < 640) {
        // Other phones (iPhone 12, iPhone 13, etc.)
        newCalendarHeight = 450;
      }

      const touchChanged = hasTouchSupport !== isTouchDevice;
      const screenChanged = newIsSmallScreen !== isSmallScreen;
      const heightChanged = newCalendarHeight !== calendarHeight;

      if (touchChanged || screenChanged || heightChanged) {
        setIsTouchDevice(hasTouchSupport);
        setIsSmallScreen(newIsSmallScreen);
        setCalendarHeight(newCalendarHeight);

        // Force calendar re-render if touch detection changed
        if (touchChanged) {
          setCalendarKey((prev) => prev + 1);
        }

        // Debug log for development (remove in production)
        if (
          process.env.NODE_ENV === 'development' &&
          (screenChanged || heightChanged)
        ) {
          console.log('Layout decision:', {
            width,
            height,
            area: width * height,
            isVerySmallWidth,
            isLimitedHeight,
            isSmallArea,
            useModal: newIsSmallScreen,
            calendarHeight: newCalendarHeight,
          });
        }
      }
    };

    // Check initial device
    checkDevice();

    // Listen for viewport changes
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, [isTouchDevice, isSmallScreen, calendarHeight]);

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

    // Only use modal on small screens (phones), not tablets
    if (isSmallScreen) {
      setIsMobileEventModalOpen(true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const success = await deleteEvent(id);
    if (success) {
      setSelectedEvent(null);
      // Close modal if open on small screens
      if (isSmallScreen) {
        setIsMobileEventModalOpen(false);
      }
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const success = await updateEvent(event);
    if (success && selectedEvent) {
      setSelectedEvent({ ...selectedEvent, ...event });
      // Close modal if open on small screens
      if (isSmallScreen) {
        setIsMobileEventModalOpen(false);
      }
    }
  };

  const handleCloseMobileEventModal = () => {
    setIsMobileEventModalOpen(false);
  };

  const handleLanguageToggle = () => {
    const newLanguage = i18n.language === 'en' ? 'he' : 'en';
    changeLanguage(newLanguage);
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
      <CalendarHeader
        onLanguageToggle={handleLanguageToggle}
        isLanguageLoading={isLanguageLoading}
      />
      <Calendar
        key={calendarKey}
        localizer={localizer}
        events={occurrences}
        startAccessor='start'
        endAccessor='end'
        style={{ height: calendarHeight }}
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

              // Count events for this day
              const dayEventCount = occurrences.filter((event) =>
                moment(event.start).isSame(date, 'day'),
              ).length;

              // Adapt layout based on calendar height
              const isVerySmallCalendar = calendarHeight <= 300;

              // Touch device click handler
              const handleTouchClick = (
                e: React.MouseEvent | React.TouchEvent,
              ) => {
                // Handle clicks on all touch devices (phones, tablets, etc.)
                if (isTouchDevice) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDaySelect(date);
                }
              };

              return (
                <div
                  className={`flex ${isVerySmallCalendar ? 'flex-col justify-center items-center' : 'flex-col items-center'} w-full h-full ${
                    isTouchDevice ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    minHeight: isVerySmallCalendar ? '32px' : '40px',
                    display: 'flex',
                    padding: isVerySmallCalendar ? '1px 2px' : '4px',
                    touchAction: 'manipulation',
                    // On desktop, let day background handle clicks
                    pointerEvents: isTouchDevice ? 'auto' : 'none',
                  }}
                  onClick={handleTouchClick}
                  onTouchEnd={handleTouchClick}
                >
                  {isVerySmallCalendar ? (
                    // Ultra-compact layout for very small screens - everything in one line
                    <div className='flex items-center justify-center w-full h-full space-x-1'>
                      <span
                        className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}
                      >
                        {label}
                      </span>
                      {dayEventCount > 0 && (
                        <span
                          className={`inline-flex items-center justify-center w-3 h-3 text-xs rounded-full ${
                            isSelected
                              ? 'bg-white text-blue-600'
                              : 'bg-blue-600 text-white'
                          }`}
                          style={{ fontSize: '9px', lineHeight: '1' }}
                        >
                          {dayEventCount > 9 ? '9' : dayEventCount}
                        </span>
                      )}
                      <span
                        className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        style={{ fontSize: '10px' }}
                      >
                        {gematriya(hdate.getDate())}
                      </span>
                    </div>
                  ) : (
                    // Standard vertical layout for larger screens
                    <>
                      <div className='flex items-center space-x-1'>
                        <span
                          className={
                            isSelected
                              ? 'text-white'
                              : 'text-gray-900 dark:text-gray-100'
                          }
                        >
                          {label}
                        </span>
                        {dayEventCount > 0 && (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                              isSelected
                                ? 'bg-white text-blue-600'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {dayEventCount > 9 ? '9+' : dayEventCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {gematriya(hdate.getDate())}
                      </span>
                    </>
                  )}
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
        className={`${isSmallScreen ? 'mt-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'} ${i18n.language === 'he' ? 'md:grid-flow-col-dense' : ''}`}
      >
        <DayEvents
          events={dayEvents}
          onSelectEvent={handleSelectEvent}
          onAddEvent={() => setIsModalOpen(true)}
          selectedDate={selectedDate}
        />
        {/* Hide EventDetails only on small screens (phones) - tablets get two-panel view */}
        {!isSmallScreen && (
          <EventDetails
            event={selectedEvent}
            onDelete={handleDeleteEvent}
            onSave={handleSaveEvent}
            isSaving={isSaving}
            isDeleting={isDeleting}
          />
        )}
      </div>
      {/* Event creation modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 z-50 flex justify-center items-center'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-600'>
            <EventForm
              onAddEvent={handleAddEvent}
              isCreating={isCreating}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className='mt-4 w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200'
            >
              {t('Close')}
            </button>
          </div>
        </div>
      )}

      {/* Small screen event details modal (phones only) */}
      {isMobileEventModalOpen && selectedEvent && (
        <div className='fixed inset-0 bg-black dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 z-50 flex justify-center items-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-600'>
            <div className='flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'>
              <h2
                className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${
                  i18n.language === 'he' ? 'text-right' : 'text-left'
                }`}
              >
                {t('Event Details')}
              </h2>
              <button
                onClick={handleCloseMobileEventModal}
                className='text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400'
                aria-label={t('Close')}
              >
                ×
              </button>
            </div>
            <div className='p-4 overflow-y-auto bg-white dark:bg-gray-800'>
              <EventDetails
                event={selectedEvent}
                onDelete={handleDeleteEvent}
                onSave={handleSaveEvent}
                isSaving={isSaving}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
