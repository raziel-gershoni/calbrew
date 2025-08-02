
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/he'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '@/styles/calendar.css'
import CustomToolbar from './CustomToolbar'
import { HDate, gematriya } from '@hebcal/core'
import EventForm from './EventForm'
import DayEvents from './DayEvents'
import EventDetails from './EventDetails'
import { Event } from '@/types/event'

moment.locale('he');
const localizer = momentLocalizer(moment)

const messages = {
  previous: '→',
  next: '←',
  today: 'היום',
  month: 'חודש',
  week: 'שבוע',
  day: 'יום',
  agenda: 'סדר יום',
  date: 'תאריך',
  time: 'שעה',
  event: 'אירוע',
  showMore: (total: number) => `+${total} עוד`,
};

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarDisplayEvent | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [date, setDate] = useState(new Date())

  const fetchEvents = useCallback(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then((data: Event[]) => {
        const formattedEvents = data.map((event) => {
          const hebrewDate = new HDate(event.hebrew_day, event.hebrew_month, event.hebrew_year);
          return {
            ...event,
            start: hebrewDate.greg(),
            end: hebrewDate.greg(),
          }
        })
        setEvents(formattedEvents)
      })
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start)
  }

  const handleAddEvent = async (event: Omit<Event, 'id'>) => {
    setIsCreating(true)
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })
    fetchEvents()
    setIsModalOpen(false)
    setIsCreating(false)
  }

  const handleSelectEvent = (event: CalendarDisplayEvent) => {
    setSelectedEvent(event)
    setSelectedDate(event.start)
  }

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, {
      method: 'DELETE'
    })
    fetchEvents()
    setSelectedEvent(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveEvent = async (_event: Event) => {
    // TODO: Implement save logic
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const dayEvents = events.filter(event => moment(event.start).isSame(selectedDate, 'day'))

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        rtl={true}
        selectable
        date={date}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        messages={messages}
        components={{
          toolbar: CustomToolbar,
          month: {
            dateHeader: ({ date, label }) => {
              const hdate = new HDate(date);
              return (
                <div className="flex flex-col items-center">
                  <span>{label}</span>
                  <span className="text-xs text-gray-500">{gematriya(hdate.getDate())}</span>
                </div>
              )
            }
          }
        }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <DayEvents events={dayEvents} onSelectEvent={handleSelectEvent} onAddEvent={() => setIsModalOpen(true)} />
        <EventDetails event={selectedEvent} onDelete={handleDeleteEvent} onSave={handleSaveEvent} />
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-lg">
            <EventForm onAddEvent={handleAddEvent} isCreating={isCreating} selectedDate={selectedDate} />
            <button onClick={() => setIsModalOpen(false)} className="mt-4 bg-red-500 text-white p-2 rounded-md">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
