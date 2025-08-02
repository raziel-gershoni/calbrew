'use client'

import { Event } from '@/types/event'

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

interface DayEventsProps {
  events: CalendarDisplayEvent[];
  onSelectEvent: (event: CalendarDisplayEvent) => void;
  onAddEvent: () => void;
}

export default function DayEvents({ events, onSelectEvent, onAddEvent }: DayEventsProps) {
  return (
    <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Events</h2>
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