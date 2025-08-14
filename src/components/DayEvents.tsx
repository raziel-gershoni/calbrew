'use client';

import { HDate, gematriya, Locale } from '@hebcal/core';
import { useTranslation } from 'react-i18next';
import { EventOccurrence } from '@/utils/hebrewDateUtils';

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

  if (selectedDate) {
    const hdate = new HDate(selectedDate);
    if (i18n.language === 'he') {
      const day = gematriya(hdate.getDate());
      const month = Locale.gettext(hdate.getMonthName(), 'he');
      const year = gematriya(hdate.getFullYear());
      hebrewDateStr = `${day} ${month}, ${year}`;
    } else {
      hebrewDateStr = hdate.render();
    }
    gregorianDateStr = selectedDate.toLocaleDateString(
      i18n.language === 'he' ? 'he-IL' : 'en-US',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );
  }

  const dateStr = selectedDate
    ? i18n.language === 'he'
      ? `${hebrewDateStr} (${gregorianDateStr})`
      : `${gregorianDateStr} (${hebrewDateStr})`
    : '';

  return (
    <div
      className='bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4'
      dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
    >
      <div className='flex justify-between items-center mb-4'>
        <div className='text-start'>
          <h2 className='text-xl font-bold'>{t('Events')}</h2>
          {selectedDate && (
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {dateStr}
            </p>
          )}
        </div>
        <button
          onClick={onAddEventClick}
          className='bg-blue-500 text-white p-2 rounded-md'
        >
          {t('Add Event')}
        </button>
      </div>
      <ul className='text-start'>
        {events.map((event) => (
          <li
            key={event.id}
            onClick={() => onEventClick(event)}
            className='cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded-md'
          >
            {event.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
