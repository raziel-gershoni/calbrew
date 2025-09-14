'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { HDate, gematriya, Locale } from '@hebcal/core';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useCalendarMode } from '@/contexts/CalendarModeContext';
import EventForm from './EventForm';
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import LoadingSpinner from './LoadingSpinner';
import CalendarHeader from './CalendarHeader';
import JumpToDateModal from './JumpToDateModal';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import { useEvents } from '@/hooks/useEvents';
import { useHebrewEvents } from '@/hooks/useHebrewEvents';
import {
  generateEventOccurrences,
  EventOccurrence,
  getOverlappingGregorianMonths,
  getOverlappingHebrewMonths,
  getHebrewEventsForCalendarRange,
  HebrewCalendarEvent,
} from '@/utils/hebrewDateUtils';

// Types
interface HebrewDay {
  hebrewDay: number;
  hebrewMonth: string;
  hebrewYear: number;
  gregorianDate: Date;
  weekday: number;
  hebrewDateString: string;
  isCurrentMonth?: boolean;
}

interface GregorianDay {
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  date: Date;
  weekday: number;
  isCurrentMonth: boolean;
}

// Type guards
const isHebrewDay = (day: HebrewDay | GregorianDay): day is HebrewDay => {
  return 'hebrewDay' in day && 'gregorianDate' in day;
};

const isGregorianDay = (day: HebrewDay | GregorianDay): day is GregorianDay => {
  return 'gregorianDay' in day && 'date' in day;
};

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const { calendarMode } = useCalendarMode();
  const actualCalendarMode = calendarMode;
  const { showHebrewEvents } = useHebrewEvents();

  const {
    events: masterEvents,
    isLoading,
    isCreating,
    isSaving,
    isDeleting,
    fetchEvents: _fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  // Get localized weekday names
  const weekdays = useMemo(() => {
    const baseDate = new Date(2024, 0, 7); // Sunday, Jan 7, 2024
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      if (i18n.language === 'he') {
        return date
          .toLocaleDateString('he-IL', { weekday: 'short' })
          .replace('יום ', '');
      } else {
        return date.toLocaleDateString(i18n.language, { weekday: 'short' });
      }
    });
  }, [i18n.language]);

  // Calendar state
  const [hebrewYear, setHebrewYear] = useState(5785);
  const [hebrewMonth, setHebrewMonth] = useState('Tishrei');
  const [gregorianYear, setGregorianYear] = useState(2024);
  const [gregorianMonth, setGregorianMonth] = useState(8);

  // Event display state
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [hebrewEvents, setHebrewEvents] = useState<HebrewCalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const selectedDateRef = useRef<Date | null>(new Date());

  // Helper function to update both state and ref synchronously
  const updateSelectedDate = (date: Date | null) => {
    selectedDateRef.current = date;
    setSelectedDate(date);
  };
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJumpToDateModalOpen, setIsJumpToDateModalOpen] = useState(false);

  // Initialize calendar to current month
  useEffect(() => {
    const now = new Date();
    const hebrewDate = new HDate(now);
    setHebrewYear(hebrewDate.getFullYear());
    setHebrewMonth(hebrewDate.getMonthName());
    setGregorianYear(now.getFullYear());
    setGregorianMonth(now.getMonth());
  }, []);

  // Get calendar view date range for event filtering
  const calendarViewRange = useMemo(() => {
    if (actualCalendarMode === 'hebrew') {
      const firstDay = new HDate(1, hebrewMonth, hebrewYear);
      let lastDay: Date;
      try {
        const testDate = new HDate(30, hebrewMonth, hebrewYear);
        if (testDate.getMonth() === firstDay.getMonth()) {
          lastDay = testDate.greg();
        } else {
          lastDay = new HDate(29, hebrewMonth, hebrewYear).greg();
        }
      } catch {
        lastDay = new HDate(29, hebrewMonth, hebrewYear).greg();
      }

      const firstDayGregorian = firstDay.greg();
      const firstWeekday = firstDayGregorian.getDay();

      const gridStart = new Date(firstDayGregorian);
      gridStart.setDate(gridStart.getDate() - firstWeekday);

      const gridEnd = new Date(lastDay);
      const totalDaysInCurrentMonth =
        Math.ceil(
          (lastDay.getTime() - firstDayGregorian.getTime()) /
            (24 * 60 * 60 * 1000),
        ) + 1;
      const totalCells =
        Math.ceil((firstWeekday + totalDaysInCurrentMonth) / 7) * 7;
      const remainingCells =
        totalCells - firstWeekday - totalDaysInCurrentMonth;
      gridEnd.setDate(gridEnd.getDate() + remainingCells);

      return { start: gridStart, end: gridEnd };
    } else {
      const firstDay = new Date(gregorianYear, gregorianMonth, 1);
      const lastDay = new Date(gregorianYear, gregorianMonth + 1, 0);
      const firstWeekday = firstDay.getDay();

      const gridStart = new Date(
        gregorianYear,
        gregorianMonth,
        1 - firstWeekday,
      );

      const daysInMonth = lastDay.getDate();
      const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
      const remainingCells = totalCells - firstWeekday - daysInMonth;
      const gridEnd = new Date(
        gregorianYear,
        gregorianMonth + 1,
        remainingCells,
      );

      return { start: gridStart, end: gridEnd };
    }
  }, [
    actualCalendarMode,
    hebrewYear,
    hebrewMonth,
    gregorianYear,
    gregorianMonth,
  ]);

  // Generate event occurrences for entire calendar view
  useEffect(() => {
    const newOccurrences = generateEventOccurrences(
      masterEvents,
      calendarViewRange.start,
      calendarViewRange.end,
    );
    setOccurrences(newOccurrences);
  }, [masterEvents, calendarViewRange]);

  // Fetch Hebrew calendar events for the entire calendar view range
  useEffect(() => {
    if (showHebrewEvents) {
      const events = getHebrewEventsForCalendarRange(
        calendarViewRange.start,
        calendarViewRange.end,
        i18n.language,
      );
      setHebrewEvents(events);
    } else {
      setHebrewEvents([]);
    }
  }, [showHebrewEvents, calendarViewRange, i18n.language]);

  // Generate Hebrew month view with overlapping days
  const hebrewCalendarGrid = useMemo(() => {
    if (actualCalendarMode !== 'hebrew') {
      return null;
    }

    const days: (HebrewDay | null)[][] = [];

    // Get the correct number of days in Hebrew month
    const firstOfMonth = new HDate(1, hebrewMonth, hebrewYear);
    const dayCount = firstOfMonth.daysInMonth();

    const firstDay = new HDate(1, hebrewMonth, hebrewYear);
    const firstDayGregorian = firstDay.greg();
    const firstWeekday = firstDayGregorian.getDay();

    let currentWeek: (HebrewDay | null)[] = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < firstWeekday; i++) {
      const prevDayGregorian = new Date(firstDayGregorian);
      prevDayGregorian.setDate(prevDayGregorian.getDate() - (firstWeekday - i));
      const prevDayHebrew = new HDate(prevDayGregorian);
      currentWeek.push({
        hebrewDay: prevDayHebrew.getDate(),
        hebrewMonth: prevDayHebrew.getMonthName(),
        hebrewYear: prevDayHebrew.getFullYear(),
        gregorianDate: prevDayGregorian,
        weekday: prevDayGregorian.getDay(),
        hebrewDateString: prevDayHebrew.toString(),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= dayCount; day++) {
      const hDate = new HDate(day, hebrewMonth, hebrewYear);
      const gregorianDate = hDate.greg();
      currentWeek.push({
        hebrewDay: day,
        hebrewMonth: hebrewMonth,
        hebrewYear: hebrewYear,
        gregorianDate: gregorianDate,
        weekday: gregorianDate.getDay(),
        hebrewDateString: hDate.toString(),
        isCurrentMonth: true,
      });

      if (currentWeek.length === 7) {
        days.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Fill remaining days of the last week
    if (currentWeek.length > 0) {
      const lastDayOfMonth = new HDate(dayCount, hebrewMonth, hebrewYear);
      const lastDayGregorian = lastDayOfMonth.greg();

      let dayOffset = 1;
      while (currentWeek.length < 7) {
        const nextDayGregorian = new Date(lastDayGregorian);
        nextDayGregorian.setDate(lastDayGregorian.getDate() + dayOffset);
        const nextDayHebrew = new HDate(nextDayGregorian);
        currentWeek.push({
          hebrewDay: nextDayHebrew.getDate(),
          hebrewMonth: nextDayHebrew.getMonthName(),
          hebrewYear: nextDayHebrew.getFullYear(),
          gregorianDate: nextDayGregorian,
          weekday: nextDayGregorian.getDay(),
          hebrewDateString: nextDayHebrew.toString(),
          isCurrentMonth: false,
        });
        dayOffset++;
      }
      days.push(currentWeek);
    }

    return { weeks: days };
  }, [hebrewYear, hebrewMonth, actualCalendarMode]);

  // Generate Gregorian month view with overlapping days
  const gregorianCalendarGrid = useMemo(() => {
    if (actualCalendarMode !== 'gregorian') {
      return null;
    }

    const days: (GregorianDay | null)[][] = [];
    const firstDay = new Date(gregorianYear, gregorianMonth, 1);
    const lastDay = new Date(gregorianYear, gregorianMonth + 1, 0);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    let currentWeek: (GregorianDay | null)[] = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < firstWeekday; i++) {
      const prevDate = new Date(
        gregorianYear,
        gregorianMonth,
        1 - firstWeekday + i,
      );
      currentWeek.push({
        gregorianDay: prevDate.getDate(),
        gregorianMonth: prevDate.getMonth(),
        gregorianYear: prevDate.getFullYear(),
        date: prevDate,
        weekday: prevDate.getDay(),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(gregorianYear, gregorianMonth, day);
      currentWeek.push({
        gregorianDay: day,
        gregorianMonth: gregorianMonth,
        gregorianYear: gregorianYear,
        date: date,
        weekday: date.getDay(),
        isCurrentMonth: true,
      });

      if (currentWeek.length === 7) {
        days.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Fill remaining days of the last week
    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        const nextDate = new Date(gregorianYear, gregorianMonth + 1, nextDay);
        currentWeek.push({
          gregorianDay: nextDay,
          gregorianMonth: gregorianMonth + 1,
          gregorianYear:
            gregorianMonth === 11 ? gregorianYear + 1 : gregorianYear,
          date: nextDate,
          weekday: nextDate.getDay(),
          isCurrentMonth: false,
        });
        nextDay++;
      }
      days.push(currentWeek);
    }

    return { weeks: days };
  }, [gregorianYear, gregorianMonth, actualCalendarMode]);

  // Helper functions
  const getHebrewDate = (date: Date) => {
    const hdate = new HDate(date);
    const monthName = hdate.getMonthName();

    if (i18n.language === 'he') {
      const hebrewMonthName = Locale.gettext(monthName, 'he') || monthName;
      return {
        day: gematriya(hdate.getDate()),
        month: hebrewMonthName,
        year: gematriya(hdate.getFullYear()),
      };
    } else {
      return {
        day: hdate.getDate().toString(),
        month: monthName,
        year: hdate.getFullYear().toString(),
      };
    }
  };

  const getGregorianDate = (hebrewDay: HebrewDay) => {
    const date = hebrewDay.gregorianDate;
    const monthName = date.toLocaleDateString(i18n.language, { month: 'long' });
    return {
      day: date.getDate(),
      month: monthName,
      year: date.getFullYear(),
    };
  };

  const getCurrentMonthName = () => {
    if (actualCalendarMode === 'hebrew') {
      const hebrewMonthName =
        i18n.language === 'he'
          ? Locale.gettext(hebrewMonth, 'he') || hebrewMonth
          : hebrewMonth;

      const primaryYear =
        i18n.language === 'he' ? gematriya(hebrewYear) : hebrewYear;

      const overlappingGregorianMonths = getOverlappingGregorianMonths(
        hebrewMonth,
        hebrewYear,
        i18n.language,
      );

      return `${hebrewMonthName} ${primaryYear} (${overlappingGregorianMonths})`;
    } else {
      const date = new Date(gregorianYear, gregorianMonth, 1);
      const monthName = date.toLocaleDateString(i18n.language, {
        month: 'long',
      });

      const overlappingHebrewMonths = getOverlappingHebrewMonths(
        gregorianMonth,
        gregorianYear,
        i18n.language,
      );

      return `${monthName} ${gregorianYear} (${overlappingHebrewMonths})`;
    }
  };

  const getEventsForDate = (date: Date): EventOccurrence[] => {
    const dateStr = date.toDateString();
    return occurrences.filter((event) => event.date.toDateString() === dateStr);
  };

  const eventsForSelectedDate = useMemo(() => {
    const currentDate = selectedDateRef.current;
    return currentDate ? getEventsForDate(currentDate) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, getEventsForDate]); // selectedDate needed to trigger re-renders

  const hebrewEventsForSelectedDate = useMemo(() => {
    const currentDate = selectedDateRef.current;
    return currentDate && showHebrewEvents
      ? hebrewEvents.filter((hebrewEvent) => {
          const eventDate = hebrewEvent.date;
          return (
            eventDate.getDate() === currentDate.getDate() &&
            eventDate.getMonth() === currentDate.getMonth() &&
            eventDate.getFullYear() === currentDate.getFullYear()
          );
        })
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, showHebrewEvents, hebrewEvents]); // selectedDate needed to trigger re-renders

  // Navigation functions
  const navigateHebrewMonth = (direction: 'prev' | 'next') => {
    const currentDate = new HDate(1, hebrewMonth, hebrewYear);
    const currentMonth = currentDate.getMonth(); // Get numeric month (1=Nisan, 7=Tishrei)
    const currentYear = currentDate.getFullYear();

    let newMonth: number;
    let newYear: number;

    if (direction === 'next') {
      // In Hebrew calendar: 1=Nisan...6=Elul, 7=Tishrei...12/13=Adar(II)
      // Year boundary is between Elul (6) and Tishrei (7)
      if (currentMonth === 6) {
        // Elul -> Tishrei (new year)
        newMonth = 7; // Tishrei
        newYear = currentYear + 1;
      } else if (currentMonth < 6) {
        // Nisan to Elul (same year)
        newMonth = currentMonth + 1;
        newYear = currentYear;
      } else {
        // Tishrei to Adar (same year)
        const monthsInCurrentYear = currentDate.isLeapYear() ? 13 : 12;
        if (currentMonth < monthsInCurrentYear) {
          newMonth = currentMonth + 1;
          newYear = currentYear;
        } else {
          // Adar -> Nisan (same Hebrew year, but next "cycle")
          newMonth = 1; // Nisan
          newYear = currentYear;
        }
      }
    } else {
      // Previous month navigation
      if (currentMonth === 7) {
        // Tishrei -> Elul (previous year)
        newMonth = 6; // Elul
        newYear = currentYear - 1;
      } else if (currentMonth === 1) {
        // Nisan -> Adar (previous "cycle")
        const prevYearForAdar = new HDate(1, 1, currentYear);
        newMonth = prevYearForAdar.isLeapYear() ? 13 : 12; // Adar or Adar II
        newYear = currentYear;
      } else {
        newMonth = currentMonth - 1;
        newYear = currentYear;
      }
    }

    // Create new date and get its month name
    const targetDate = new HDate(1, newMonth, newYear);
    setHebrewYear(newYear);
    setHebrewMonth(targetDate.getMonthName());
    // Update selectedDate to the first day of the new month
    updateSelectedDate(targetDate.greg());
  };

  const navigateGregorianMonth = (direction: 'prev' | 'next') => {
    let newMonth, newYear;

    if (direction === 'next') {
      if (gregorianMonth === 11) {
        newMonth = 0;
        newYear = gregorianYear + 1;
        setGregorianMonth(0);
        setGregorianYear(gregorianYear + 1);
      } else {
        newMonth = gregorianMonth + 1;
        newYear = gregorianYear;
        setGregorianMonth(gregorianMonth + 1);
      }
    } else {
      if (gregorianMonth === 0) {
        newMonth = 11;
        newYear = gregorianYear - 1;
        setGregorianMonth(11);
        setGregorianYear(gregorianYear - 1);
      } else {
        newMonth = gregorianMonth - 1;
        newYear = gregorianYear;
        setGregorianMonth(gregorianMonth - 1);
      }
    }

    // Update selectedDate to the first day of the new month
    updateSelectedDate(new Date(newYear, newMonth, 1));
  };

  const navigateToToday = () => {
    const now = new Date();
    updateSelectedDate(now);
    if (actualCalendarMode === 'hebrew') {
      const hebrewDate = new HDate(now);
      setHebrewYear(hebrewDate.getFullYear());
      setHebrewMonth(hebrewDate.getMonthName());
    } else {
      setGregorianYear(now.getFullYear());
      setGregorianMonth(now.getMonth());
    }
  };

  const handleDayClick = (date: Date) => {
    updateSelectedDate(date);
  };

  const handleEventClick = (event: EventOccurrence) => {
    setSelectedEvent(event);
  };

  const handleJumpToDate = (date: Date) => {
    updateSelectedDate(date);
    if (actualCalendarMode === 'hebrew') {
      const hebrewDate = new HDate(date);
      setHebrewYear(hebrewDate.getFullYear());
      setHebrewMonth(hebrewDate.getMonthName());
    } else {
      setGregorianYear(date.getFullYear());
      setGregorianMonth(date.getMonth());
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen={true} />;
  }

  return (
    <div className='flex flex-col h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <CalendarHeader />

      {/* Event Form Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50'>
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'
            dir={getTextDirection(i18n.language)}
          >
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {selectedEvent ? t('Edit Event') : t('Create New Event')}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                  }}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  ✕
                </button>
              </div>
            </div>
            <div className='p-4'>
              <EventForm
                key={`event-form-${isModalOpen}-${selectedDateRef.current?.getTime()}`}
                selectedDate={selectedDateRef.current}
                onDateChange={updateSelectedDate}
                onAddEvent={async (eventData) => {
                  try {
                    if (selectedEvent) {
                      const updateData = {
                        id: selectedEvent.id,
                        title: eventData.title,
                        description: eventData.description,
                        hebrew_year: eventData.hebrew_year,
                        hebrew_month: eventData.hebrew_month,
                        hebrew_day: eventData.hebrew_day,
                        recurrence_rule: eventData.recurrence_rule,
                      };
                      await updateEvent(updateData);
                    } else {
                      await createEvent(eventData);
                    }
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error saving event:', error);
                  }
                }}
                isCreating={isCreating || isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Jump to Date Modal */}
      <JumpToDateModal
        isOpen={isJumpToDateModalOpen}
        onClose={() => setIsJumpToDateModalOpen(false)}
        onDateSelected={handleJumpToDate}
        initialDate={selectedDateRef.current || new Date()}
      />

      {/* Event Details Modal */}
      {selectedEvent && !isModalOpen && (
        <div className='fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50'>
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'
            dir={getTextDirection(i18n.language)}
          >
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {t('Event Details')}
                </h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  ✕
                </button>
              </div>
            </div>
            <div className='p-4'>
              <EventDetails
                event={selectedEvent}
                onDelete={async (id: string) => {
                  try {
                    await deleteEvent(id);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error deleting event:', error);
                  }
                }}
                onSave={async (event) => {
                  try {
                    await updateEvent(event);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error updating event:', error);
                  }
                }}
                onSync={async (id: string) => {
                  try {
                    const response = await fetch(`/api/events/${id}/sync`, {
                      method: 'POST',
                    });
                    if (!response.ok) {
                      throw new Error('Failed to sync event');
                    }
                    // EventDetails component handles the sync status update via local state
                  } catch (error) {
                    console.error('Error syncing event:', error);
                    throw error; // Re-throw to let EventDetails handle the error state
                  }
                }}
                isSaving={isSaving}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Unified Responsive Layout */}
      <div className='flex-1 min-h-0 overflow-hidden'>
        <div
          className='h-full calendar-responsive-layout p-1 sm:p-2 lg:p-3'
          dir={getTextDirection(i18n.language)}
        >
          {/* Calendar Section */}
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0 overflow-hidden'
            style={{ flex: '2', minHeight: '0', minWidth: '0' }}
          >
            {/* Header - Compact design matching button height */}
            <div className='flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900'>
              <div className='flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5'>
                <button
                  onClick={() =>
                    actualCalendarMode === 'hebrew'
                      ? navigateHebrewMonth('prev')
                      : navigateGregorianMonth('prev')
                  }
                  className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                >
                  <ChevronLeftIcon className='w-4 h-4 rtl:rotate-180' />
                </button>
                <button
                  onClick={navigateToToday}
                  className='px-2.5 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                >
                  {t('Today')}
                </button>
                <button
                  onClick={() =>
                    actualCalendarMode === 'hebrew'
                      ? navigateHebrewMonth('next')
                      : navigateGregorianMonth('next')
                  }
                  className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                >
                  <ChevronRightIcon className='w-4 h-4 rtl:rotate-180' />
                </button>
              </div>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100 text-center flex-1 min-w-0 mx-2'>
                <span className='truncate'>{getCurrentMonthName()}</span>
              </h2>
              <button
                onClick={() => setIsJumpToDateModalOpen(true)}
                className='px-2.5 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
              >
                {t('Go to Date')}
              </button>
            </div>

            {/* Weekday Headers */}
            <div className='grid grid-cols-7 gap-1 p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900'>
              {weekdays.map((day) => (
                <div
                  key={day}
                  className='text-center text-sm font-medium text-gray-500 p-1'
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Uses CSS container queries for responsive content */}
            <div
              className='flex-1 grid grid-cols-7 gap-1 p-2 min-h-0 overflow-hidden'
              dir={getTextDirection(i18n.language)}
              style={{
                gridTemplateRows: `repeat(${
                  actualCalendarMode === 'hebrew'
                    ? hebrewCalendarGrid?.weeks.length || 6
                    : gregorianCalendarGrid?.weeks.length || 6
                }, minmax(0, 1fr))`,
              }}
            >
              {(actualCalendarMode === 'hebrew'
                ? hebrewCalendarGrid?.weeks.flat()
                : gregorianCalendarGrid?.weeks.flat()
              )?.map((day, index) => {
                // Get events for this day
                let dateToCheck: Date;
                let dayEvents: EventOccurrence[] = [];
                let dayHebrewEvents: HebrewCalendarEvent[] = [];

                // Always set dateToCheck based on calendar mode and day type
                if (day) {
                  if (actualCalendarMode === 'hebrew' && isHebrewDay(day)) {
                    dateToCheck = day.gregorianDate;
                  } else if (
                    actualCalendarMode === 'gregorian' &&
                    isGregorianDay(day)
                  ) {
                    dateToCheck = day.date;
                  } else if (isHebrewDay(day)) {
                    // Fallback: if day is HebrewDay but we're in wrong mode
                    dateToCheck = day.gregorianDate;
                  } else if (isGregorianDay(day)) {
                    // Fallback: if day is GregorianDay but we're in wrong mode
                    dateToCheck = day.date;
                  } else {
                    // Last resort fallback
                    dateToCheck = new Date();
                  }
                  dayEvents = getEventsForDate(dateToCheck);
                } else {
                  dateToCheck = new Date();
                }

                // Get Hebrew calendar events for this day
                if (dateToCheck! && showHebrewEvents) {
                  dayHebrewEvents = hebrewEvents.filter((hebrewEvent) => {
                    const eventDate = hebrewEvent.date;
                    return (
                      eventDate.getDate() === dateToCheck.getDate() &&
                      eventDate.getMonth() === dateToCheck.getMonth() &&
                      eventDate.getFullYear() === dateToCheck.getFullYear()
                    );
                  });
                }

                return (
                  <div
                    key={index}
                    onClick={() =>
                      day && handleDayClick(dateToCheck || new Date())
                    }
                    className={`
                      calendar-cell border rounded cursor-pointer transition-colors
                      ${
                        day?.isCurrentMonth !== false
                          ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-transparent not-current-month'
                      }
                      ${
                        day &&
                        selectedDate &&
                        ((actualCalendarMode === 'hebrew' &&
                          isHebrewDay(day) &&
                          selectedDate.toDateString() ===
                            day.gregorianDate.toDateString()) ||
                          (actualCalendarMode === 'gregorian' &&
                            isGregorianDay(day) &&
                            selectedDate.toDateString() ===
                              day.date.toDateString()))
                          ? 'selected'
                          : ''
                      }
                    `}
                  >
                    {day && (
                      <div className='calendar-cell-content'>
                        {/* Date column (left in LTR, right in RTL) */}
                        <div className='calendar-cell-date-column'>
                          <div className='calendar-cell-primary-date text-gray-900 dark:text-gray-100'>
                            {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                              ? i18n.language === 'he'
                                ? gematriya(day.hebrewDay)
                                : day.hebrewDay
                              : isGregorianDay(day)
                                ? day.gregorianDay
                                : ''}
                          </div>
                          <div className='calendar-cell-secondary-date text-gray-500 dark:text-gray-400'>
                            {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                              ? getGregorianDate(day).day
                              : isGregorianDay(day)
                                ? getHebrewDate(day.date).day
                                : ''}
                            <span className='calendar-cell-secondary-month'>
                              {actualCalendarMode === 'hebrew' &&
                              isHebrewDay(day)
                                ? ` ${getGregorianDate(day).month}`
                                : isGregorianDay(day)
                                  ? ` ${getHebrewDate(day.date).month}`
                                  : ''}
                            </span>
                          </div>
                        </div>

                        {/* Events column (right in LTR, left in RTL) */}
                        <div className='calendar-cell-events'>
                          {/* Hebrew Calendar Event titles (shown first/on top in larger cells via CSS) */}
                          {dayHebrewEvents.map((hebrewEvent, idx) => (
                            <div
                              key={`hebrew-${idx}`}
                              className='calendar-cell-hebrew-event'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDayClick(dateToCheck || new Date());
                              }}
                            >
                              {hebrewEvent.title}
                            </div>
                          ))}

                          {/* User Event titles (shown after Hebrew events in larger cells via CSS) */}
                          {dayEvents.map((event, idx) => (
                            <div
                              key={idx}
                              className='calendar-cell-event bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                            >
                              {event.title}
                            </div>
                          ))}

                          {/* Legacy indicators (hidden in compact cells via CSS) */}
                          {(dayEvents.length > 0 ||
                            dayHebrewEvents.length > 0) && (
                            <>
                              <div className='calendar-cell-event-indicator'></div>
                              {dayEvents.length + dayHebrewEvents.length >
                                1 && (
                                <div className='calendar-cell-event-count'>
                                  +
                                  {dayEvents.length +
                                    dayHebrewEvents.length -
                                    1}
                                </div>
                              )}
                            </>
                          )}

                          {/* New circular badge for compact cells (shown via CSS) */}
                          {(dayEvents.length > 0 ||
                            dayHebrewEvents.length > 0) && (
                            <div
                              className='calendar-cell-event-badge cursor-pointer'
                              onClick={(e) => {
                                e.stopPropagation();
                                const totalEvents =
                                  dayEvents.length + dayHebrewEvents.length;
                                if (
                                  totalEvents === 1 &&
                                  dayEvents.length === 1
                                ) {
                                  handleEventClick(dayEvents[0]);
                                } else {
                                  // If multiple events, clicking the badge will select the day to show all events in sidebar
                                  handleDayClick(dateToCheck || new Date());
                                }
                              }}
                            >
                              {dayEvents.length + dayHebrewEvents.length}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events Section - Responsive sidebar/bottom panel */}
          <div style={{ flex: '1', minHeight: '0', minWidth: '0' }}>
            <DayEvents
              selectedDate={selectedDateRef.current}
              events={eventsForSelectedDate}
              hebrewEvents={hebrewEventsForSelectedDate}
              onEventClick={handleEventClick}
              onAddEventClick={() => setIsModalOpen(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
