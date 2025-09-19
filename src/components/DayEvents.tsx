'use client';

import { HDate, gematriya } from '@hebcal/core';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import {
  getLocalizedHebrewMonthName,
  getLocalizedHolidayName,
} from '@/utils/hebrewMonthLocalization';
import {
  EventOccurrence,
  HebrewCalendarEvent,
  formatEventTitle,
} from '@/utils/hebrewDateUtils';
import { useCalendarMode } from '@/contexts/CalendarModeContext';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface DayEventsProps {
  events: EventOccurrence[];
  hebrewEvents?: HebrewCalendarEvent[];
  onEventClick: (event: EventOccurrence) => void;
  onAddEventClick: () => void;
  selectedDate: Date | null;
}

export default function DayEvents({
  events,
  hebrewEvents = [],
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
      const month = getLocalizedHebrewMonthName(hdate.getMonthName(), 'he');
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
      dir={getTextDirection(i18n.language)}
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
            title={t('Add Event')}
          >
            <PlusIcon className='h-5 w-5' />
          </button>
        </div>
      </div>
      <div className='flex-1 min-h-0 p-4 overflow-hidden'>
        {events.length > 0 || hebrewEvents.length > 0 ? (
          <div className='h-full overflow-y-auto'>
            <div className='text-start space-y-4'>
              {/* Hebrew Calendar Events Section - ON TOP */}
              {hebrewEvents.length > 0 && (
                <div>
                  <h3 className='text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide'>
                    {t('Hebrew Calendar')}
                  </h3>
                  <ul className='space-y-2'>
                    {hebrewEvents.map((hebrewEvent) => (
                      <li
                        key={hebrewEvent.id}
                        className='p-3 rounded-md border border-purple-200 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      >
                        <div className='font-medium text-purple-900 dark:text-purple-100'>
                          {getLocalizedHolidayName(
                            hebrewEvent.title,
                            i18n.language,
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* User Events Section - BELOW Hebrew events */}
              {events.length > 0 && (
                <div>
                  <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide'>
                    {t('Your Events')}
                  </h3>
                  <ul className='space-y-2'>
                    {events.map((event) => (
                      <li
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className='cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-3 rounded-md border border-gray-200 dark:border-gray-600 transition-colors'
                      >
                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                          {formatEventTitle(
                            event.title,
                            event.anniversary || 0,
                          )}
                        </div>
                        {event.description && (
                          <div className='text-sm text-gray-500 dark:text-gray-400 mt-1 truncate'>
                            {event.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500 dark:text-gray-400'>
              <CalendarIcon className='w-8 h-8 mb-2 text-gray-400 mx-auto' />
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
