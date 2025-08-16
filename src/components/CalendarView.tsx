'use client';

import { useState, useEffect, useMemo } from 'react';
import { HDate, gematriya, Locale } from '@hebcal/core';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useCalendarMode } from '@/contexts/CalendarModeContext';
import EventForm from './EventForm';
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import LoadingSpinner from './LoadingSpinner';
import CalendarHeader from './CalendarHeader';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import {
  generateEventOccurrences,
  EventOccurrence,
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

// Gregorian month names in Hebrew
const GREGORIAN_MONTHS_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

// Gregorian month names in English
const GREGORIAN_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const { calendarMode } = useCalendarMode();
  const actualCalendarMode = calendarMode;

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Generate Hebrew month view with overlapping days
  const hebrewCalendarGrid = useMemo(() => {
    if (actualCalendarMode !== 'hebrew') {
      return null;
    }

    const days: (HebrewDay | null)[][] = [];
    let dayCount = 29;
    try {
      const testDate = new HDate(30, hebrewMonth, hebrewYear);
      const firstOfMonth = new HDate(1, hebrewMonth, hebrewYear);
      if (testDate.getMonth() === firstOfMonth.getMonth()) {
        dayCount = 30;
      }
    } catch {
      // Month has 29 days
    }

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

      while (currentWeek.length < 7) {
        const nextDayGregorian = new Date(lastDayGregorian);
        nextDayGregorian.setDate(
          nextDayGregorian.getDate() +
            ((currentWeek.length - ((dayCount - 1) % 7) + 6) % 7) +
            1,
        );
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
    return {
      day: date.getDate(),
      month:
        i18n.language === 'he'
          ? GREGORIAN_MONTHS_HE[date.getMonth()]
          : GREGORIAN_MONTHS_EN[date.getMonth()],
      year: date.getFullYear(),
    };
  };

  const getCurrentMonthName = () => {
    if (actualCalendarMode === 'hebrew') {
      const hebrewMonthName =
        i18n.language === 'he'
          ? Locale.gettext(hebrewMonth, 'he') || hebrewMonth
          : hebrewMonth;
      const yearDisplay =
        i18n.language === 'he' ? gematriya(hebrewYear) : hebrewYear;
      return `${hebrewMonthName} ${yearDisplay}`;
    } else {
      const monthName =
        i18n.language === 'he'
          ? GREGORIAN_MONTHS_HE[gregorianMonth]
          : GREGORIAN_MONTHS_EN[gregorianMonth];
      return `${monthName} ${gregorianYear}`;
    }
  };

  const getEventsForDate = (date: Date): EventOccurrence[] => {
    const dateStr = date.toDateString();
    return occurrences.filter((event) => event.date.toDateString() === dateStr);
  };

  const eventsForSelectedDate = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  // Navigation functions
  const navigateHebrewMonth = (direction: 'prev' | 'next') => {
    const currentDate = new HDate(1, hebrewMonth, hebrewYear);
    const currentMonth = currentDate.getMonth(); // Get numeric month (1-13)
    const currentYear = currentDate.getFullYear();

    let newMonth: number;
    let newYear: number;

    if (direction === 'next') {
      // Check if current year is a leap year to handle month count properly
      const monthsInCurrentYear = currentDate.isLeapYear() ? 13 : 12;

      if (currentMonth < monthsInCurrentYear) {
        newMonth = currentMonth + 1;
        newYear = currentYear;
      } else {
        newMonth = 1; // Tishrei (start of new year)
        newYear = currentYear + 1;
      }
    } else {
      if (currentMonth > 1) {
        newMonth = currentMonth - 1;
        newYear = currentYear;
      } else {
        // Going to previous year's last month
        newYear = currentYear - 1;
        const prevYearDate = new HDate(1, 1, newYear);
        newMonth = prevYearDate.isLeapYear() ? 13 : 12;
      }
    }

    // Create new date and get its month name
    const targetDate = new HDate(1, newMonth, newYear);
    setHebrewYear(newYear);
    setHebrewMonth(targetDate.getMonthName());
  };

  const navigateGregorianMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (gregorianMonth === 11) {
        setGregorianMonth(0);
        setGregorianYear(gregorianYear + 1);
      } else {
        setGregorianMonth(gregorianMonth + 1);
      }
    } else {
      if (gregorianMonth === 0) {
        setGregorianMonth(11);
        setGregorianYear(gregorianYear - 1);
      } else {
        setGregorianMonth(gregorianMonth - 1);
      }
    }
  };

  const navigateToToday = () => {
    const now = new Date();
    setSelectedDate(now);
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
    setSelectedDate(date);
  };

  const handleEventClick = (event: EventOccurrence) => {
    setSelectedEvent(event);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='flex flex-col h-full bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <CalendarHeader />

      {/* Event Form Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'>
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
                selectedDate={selectedDate}
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

      {/* Event Details Modal */}
      {selectedEvent && !isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'>
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
          className='h-full grid gap-2 calendar-responsive-layout p-1 sm:p-2 lg:p-3'
          dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
        >
          {/* Calendar Section */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0 overflow-hidden calendar-section'>
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
                  {i18n.language === 'he' ? (
                    <ChevronRightIcon className='w-4 h-4' />
                  ) : (
                    <ChevronLeftIcon className='w-4 h-4' />
                  )}
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
                  {i18n.language === 'he' ? (
                    <ChevronLeftIcon className='w-4 h-4' />
                  ) : (
                    <ChevronRightIcon className='w-4 h-4' />
                  )}
                </button>
              </div>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100 text-center flex-1 min-w-0 mx-2'>
                <span className='truncate'>{getCurrentMonthName()}</span>
              </h2>
              <div className='w-20'></div> {/* Spacer for balance */}
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
              style={{
                gridTemplateRows: `repeat(${
                  actualCalendarMode === 'hebrew'
                    ? hebrewCalendarGrid?.weeks.length || 6
                    : gregorianCalendarGrid?.weeks.length || 6
                }, 1fr)`,
              }}
            >
              {(actualCalendarMode === 'hebrew'
                ? hebrewCalendarGrid?.weeks.flat()
                : gregorianCalendarGrid?.weeks.flat()
              )?.map((day, index) => {
                // Get events for this day
                let dateToCheck: Date;
                let dayEvents: EventOccurrence[] = [];

                if (
                  actualCalendarMode === 'hebrew' &&
                  day &&
                  isHebrewDay(day)
                ) {
                  dateToCheck = day.gregorianDate;
                  dayEvents = getEventsForDate(dateToCheck);
                } else if (
                  actualCalendarMode === 'gregorian' &&
                  day &&
                  isGregorianDay(day)
                ) {
                  dateToCheck = day.date;
                  dayEvents = getEventsForDate(dateToCheck);
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
                        </div>
                        <div className='calendar-cell-secondary-month text-gray-500 dark:text-gray-400 hidden'>
                          {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                            ? getGregorianDate(day).month
                            : isGregorianDay(day)
                              ? getHebrewDate(day.date).month.slice(0, 3)
                              : ''}
                        </div>
                        <div className='calendar-cell-events'>
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
                          {dayEvents.length > 0 && (
                            <>
                              <div className='calendar-cell-event-indicator'></div>
                              {dayEvents.length > 1 && (
                                <div className='calendar-cell-event-count'>
                                  +{dayEvents.length - 1}
                                </div>
                              )}
                            </>
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
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg events-section'>
            <DayEvents
              selectedDate={selectedDate}
              events={eventsForSelectedDate}
              onEventClick={handleEventClick}
              onAddEventClick={() => setIsModalOpen(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
