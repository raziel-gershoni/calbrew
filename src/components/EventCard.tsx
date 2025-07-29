'use client'

import { HDate, Locale } from '@hebcal/core'

interface Event {
  id: string;
  title: string;
  description: string;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
}

interface EventCardProps {
  event: Event;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function EventCard({ event, onDelete, isDeleting }: EventCardProps) {
  const currentHebrewYear = new HDate().getFullYear()
  const anniversary = currentHebrewYear - event.hebrew_year
  const hebrewDate = new HDate(event.hebrew_day, event.hebrew_month, event.hebrew_year)

  return (
    <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4 flex flex-col justify-between leading-normal">
      <div className="mb-8">
        <div className="text-gray-900 dark:text-gray-100 font-bold text-xl mb-2">{event.title}</div>
        <p className="text-gray-700 dark:text-gray-300 text-base">{event.description}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <p className="text-gray-900 dark:text-gray-100 leading-none">{hebrewDate.renderGematriya(true)}</p>
          {event.recurrence_rule === 'yearly' && anniversary > 0 && (
            <p className="text-gray-600 dark:text-gray-400">Anniversary: {anniversary}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(event.id)}
          disabled={isDeleting}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-400"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}