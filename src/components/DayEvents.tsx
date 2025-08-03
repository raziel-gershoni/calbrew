'use client'

import { Event } from '@/types/event'
import { HDate, gematriya, Locale } from '@hebcal/core';
import moment from 'moment';

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

export default function DayEvents({ events, onSelectEvent, onAddEvent, selectedDate }: DayEventsProps) {
  let hebrewDateStr = '';
  if (selectedDate) {
    const hdate = new HDate(selectedDate);
    const day = gematriya(hdate.getDate());
    const month = Locale.gettext(hdate.getMonthName(), 'he');
    const year = gematriya(hdate.getFullYear());
    hebrewDateStr = `${day} ${month}, ${year}`;
  }

  const gregorianDate = selectedDate ? moment(selectedDate).format('MMMM Do, YYYY') : '';

  return (
    <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Events</h2>
          {selectedDate && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {gregorianDate} / {hebrewDateStr}
            </p>
          )}
        </div>
        <button onClick={onAddEvent} className="bg-blue-500 text-white p-2 rounded-md">Add Event</button>
      </div>
      <ul>
        {events.map(event => (
          <li key={event.id} onClick={() => onSelectEvent(event)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded-md">
            {event.title}
          </li>
        ))}
      </ul>
    </div>
  )
}