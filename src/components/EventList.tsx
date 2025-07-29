
'use client'

import EventCard from './EventCard'

interface Event {
  id: string;
  title: string;
  description: string;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
}

interface EventListProps {
  events: Event[];
  onDelete: (id: string) => void;
  deletingEventId: string | null;
}

export default function EventList({ events, onDelete, deletingEventId }: EventListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} onDelete={onDelete} isDeleting={deletingEventId === event.id} />
      ))}
    </div>
  )
}
