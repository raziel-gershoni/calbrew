'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CustomToolbar from './CustomToolbar';
import { HDate, gematriya } from '@hebcal/core';
import EventForm from './EventForm';

const localizer = momentLocalizer(moment);

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export default function CalendarView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchEvents = useCallback(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        const formattedEvents = data.map((event: any) => {
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

  const handleAddEvent = async (event: any) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    fetchEvents();
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async (event: Event) => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      });
      fetchEvents();
    }
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
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleDeleteEvent}
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
              isCreating={false}
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
    </div>
  );
}
