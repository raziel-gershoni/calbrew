'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/he';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import CustomToolbar from './CustomToolbar';
import { HDate, gematriya } from '@hebcal/core';
import EventForm from './EventForm';

moment.locale('he');
const localizer = momentLocalizer(moment);

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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface RawEvent {
  id: string;
  title: string;
  hebrew_day: number;
  hebrew_month: number;
  hebrew_year: number;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [date, setDate] = useState(new Date());

  const fetchEvents = useCallback(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data: RawEvent[]) => {
        const formattedEvents = data.map((event) => {
          const hebrewDate = new HDate(
            event.hebrew_day,
            event.hebrew_month,
            event.hebrew_year,
          );
          return {
            id: event.id,
            title: event.title,
            start: hebrewDate.greg(),
            end: hebrewDate.greg(),
          };
        });
        setEvents(formattedEvents);
      });
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleAddEvent = async (event: Omit<RawEvent, 'id'>) => {
    setIsCreating(true);
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    fetchEvents();
    setIsModalOpen(false);
    setIsCreating(false);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      setIsDeleting(true);
      await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'DELETE',
      });
      fetchEvents();
      setIsEventModalOpen(false);
      setIsDeleting(false);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
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
                <div className='flex flex-col items-center'>
                  <span>{label}</span>
                  <span className='text-xs text-gray-500'>
                    {gematriya(hdate.getDate())}
                  </span>
                </div>
              );
            },
          },
        }}
      />
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center'>
          <div className='bg-white p-4 rounded-lg'>
            <EventForm
              onAddEvent={handleAddEvent}
              isCreating={isCreating}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className='mt-4 bg-red-500 text-white p-2 rounded-md'
            >
              Close
            </button>
          </div>
        </div>
      )}
      {isEventModalOpen && selectedEvent && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center'>
          <div className='bg-white p-4 rounded-lg'>
            <h2 className='text-xl font-bold mb-4'>{selectedEvent.title}</h2>
            <button
              onClick={handleDeleteEvent}
              disabled={isDeleting}
              className='bg-red-500 text-white p-2 rounded-md disabled:bg-red-400'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setIsEventModalOpen(false)}
              className='mt-4 bg-gray-500 text-white p-2 rounded-md'
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
