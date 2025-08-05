'use client';

import { Event } from '@/types/event';
import { HDate, gematriya, Locale } from '@hebcal/core';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

interface DayEventsProps {
  events: CalendarDisplayEvent[];
  onSelectEvent: (event: CalendarDisplayEvent) => void;
  onAddEvent: () => void;
  selectedDate: Date | null;
}

export default function DayEvents({
  events,
  onSelectEvent,
  onAddEvent,
  selectedDate,
}: DayEventsProps) {
  const { t, i18n } = useTranslation();

  let hebrewDateStr = '';
  let gregorianDateStr = '';

  if (selectedDate) {
    moment.locale(i18n.language);
    const hdate = new HDate(selectedDate);
    if (i18n.language === 'he') {
      const day = gematriya(hdate.getDate());
      const month = Locale.gettext(hdate.getMonthName(), 'he');
      const year = gematriya(hdate.getFullYear());
      hebrewDateStr = `${day} ${month}, ${year}`;
    } else {
      hebrewDateStr = hdate.render();
    }
    gregorianDateStr = moment(selectedDate).format('Do MMMM, YYYY');
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
          onClick={onAddEvent}
          className='bg-blue-500 text-white p-2 rounded-md'
        >
          {t('Add Event')}
        </button>
      </div>
      <ul className='text-start'>
        {events.map((event) => (
          <li
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className='cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded-md'
          >
            {event.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
