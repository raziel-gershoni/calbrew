'use client';

import { HDate, gematriya, Locale } from '@hebcal/core';
import { useTranslation } from 'react-i18next';
import { EventOccurrence } from '@/utils/hebrewDateUtils';
import { useCalendarMode } from '@/contexts/CalendarModeContext';

interface DayEventsProps {
  events: EventOccurrence[];
  onEventClick: (event: EventOccurrence) => void;
  onAddEventClick: () => void;
  selectedDate: Date | null;
}

export default function DayEvents({
  events,
  onEventClick,
  onAddEventClick,
  selectedDate,
}: DayEventsProps) {
  const { t, i18n } = useTranslation();

  let hebrewDateStr = '';
  let gregorianDateStr = '';

  // Get appropriate locale for Gregorian date formatting
  const getGregorianLocale = () => {
    switch (i18n.language) {
      case 'he':
        return 'he-IL';
      case 'es':
        return 'es-ES';
      default:
        return 'en-US';
    }
  };

  // Access the calendar mode
  const { calendarMode } = useCalendarMode();

  if (selectedDate) {
    const hdate = new HDate(selectedDate);

    // Format Hebrew date based on language
    if (i18n.language === 'he') {
      const day = gematriya(hdate.getDate());
      const month = Locale.gettext(hdate.getMonthName(), 'he');
      const year = gematriya(hdate.getFullYear());
      hebrewDateStr = `${day} ${month}, ${year}`;
    } else {
      hebrewDateStr = hdate.render();
    }

    // Format Gregorian date based on language, not calendar mode
    gregorianDateStr = selectedDate.toLocaleDateString(getGregorianLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Display date string based on calendar mode instead of language
  const dateStr = selectedDate
    ? calendarMode === 'hebrew'
      ? `${hebrewDateStr} (${gregorianDateStr})`
      : `${gregorianDateStr} (${hebrewDateStr})`
    : '';

  return (
    <div
      className='h-full flex flex-col bg-white dark:bg-gray-700 shadow-lg rounded-lg'
      dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
    >
      <div className='flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-600'>
        <div className='flex justify-between items-center'>
          <div className='text-start'>
            <h2 className='text-xl font-bold'>{t('Events')}</h2>
            {selectedDate && (
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {dateStr}
              </p>
            )}
          </div>
          <button
            onClick={onAddEventClick}
            className='bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors'
          >
            {t('Add Event')}
          </button>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        {events.length > 0 ? (
          <ul className='text-start space-y-2'>
            {events.map((event) => (
              <li
                key={event.id}
                onClick={() => onEventClick(event)}
                className='cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-3 rounded-md border border-gray-200 dark:border-gray-600 transition-colors'
              >
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {event.title}
                </div>
                {event.description && (
                  <div className='text-sm text-gray-500 dark:text-gray-400 mt-1 truncate'>
                    {event.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500 dark:text-gray-400'>
              <p className='text-lg mb-2'>📅</p>
              <p className='text-sm'>
                {selectedDate
                  ? t('No events for this date')
                  : t('Select a date to view events')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
