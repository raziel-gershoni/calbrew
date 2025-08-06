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
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';
import { useSession, signOut } from 'next-auth/react';

const localizer = momentLocalizer(moment);

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
  anniversary?: number;
}

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const [masterEvents, setMasterEvents] = useState<Event[]>([]);
  const [occurrences, setOccurrences] = useState<CalendarDisplayEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarDisplayEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [date, setDate] = useState(new Date());

  const fetchEvents = useCallback(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data: Event[]) => {
        setMasterEvents(data);
      });
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const startOfMonth = moment(date).startOf('month').toDate();
    const endOfMonth = moment(date).endOf('month').toDate();

    const newOccurrences = masterEvents.flatMap((event) => {
      const occurrencesInRange: CalendarDisplayEvent[] = [];
      const startYear = new HDate(startOfMonth).getFullYear();
      const endYear = new HDate(endOfMonth).getFullYear();

      for (let year = startYear; year <= endYear; year++) {
        const hebrewDate = new HDate(
          event.hebrew_day,
          event.hebrew_month,
          year,
        );
        const gregorianDate = hebrewDate.greg();

        if (
          moment(gregorianDate).isBetween(
            startOfMonth,
            endOfMonth,
            undefined,
            '[]',
          )
        ) {
          const anniversary = year - event.hebrew_year;
          occurrencesInRange.push({
            ...event,
            start: gregorianDate,
            end: gregorianDate,
            title:
              anniversary > 0 ? `(${anniversary}) ${event.title}` : event.title,
            anniversary,
          });
        }
      }
      return occurrencesInRange;
    });

    setOccurrences(newOccurrences);
  }, [masterEvents, date]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setSelectedEvent(null);
  };

  const handleAddEvent = async (event: Omit<Event, 'id'>) => {
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

  const handleSelectEvent = (event: CalendarDisplayEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.start);
  };

  const handleDeleteEvent = async (id: string) => {
    setIsDeleting(true);
    await fetch(`/api/events/${id}`, {
      method: 'DELETE',
    });
    fetchEvents();
    setSelectedEvent(null);
    setIsDeleting(false);
  };

  const handleSaveEvent = async (event: Event) => {
    setIsSaving(true);
    await fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    fetchEvents();
    if (selectedEvent) {
      setSelectedEvent({ ...selectedEvent, ...event });
    }
    setIsSaving(false);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const dayPropGetter = (date: Date) => {
    if (selectedDate && moment(date).isSame(selectedDate, 'day')) {
      return {
        style: {
          backgroundColor: '#3b82f6',
          color: 'white',
        },
      };
    }
    return {};
  };

  const dayEvents = occurrences.filter((event) =>
    moment(event.start).isSame(selectedDate, 'day'),
  );

  const messages = {
    previous: '→',
    next: '←',
    today: t('Today'),
    month: t('Month'),
    week: t('Week'),
    day: t('Day'),
    agenda: t('Agenda'),
    date: t('Date'),
    time: t('Time'),
    event: t('Event'),
    showMore: (total: number) => `+${total} ${t('more')}`,
  };

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <div className='flex flex-col md:flex-row justify-between items-center mb-4 p-2'>
        <div className='flex justify-between w-full md:w-auto'>
          <div className='flex-1 md:w-auto flex justify-start'>
            <span className='mx-4'>
              {session?.user?.name}
              <div className='text-xs'>{session?.user?.email}</div>
            </span>
          </div>
          <div className='md:hidden flex items-center'>
            <button
              onClick={() =>
                i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en')
              }
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg mx-2'
            >
              {i18n.language === 'en' ? 'עברית' : 'English'}
            </button>
            <button
              onClick={() => signOut()}
              className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg'
            >
              {t('Sign Out')}
            </button>
          </div>
        </div>
        <div className='w-full md:w-auto mt-4 md:mt-0 flex justify-center'>
          <h1 className='text-2xl font-bold md:hidden'>Calbrew</h1>
        </div>
        <div className='hidden md:flex items-center flex-1 justify-center'>
          <h1 className='text-2xl font-bold mx-4'>Calbrew</h1>
        </div>
        <div className='hidden md:flex items-center'>
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en')
            }
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg mx-2'
          >
            {i18n.language === 'en' ? 'עברית' : 'English'}
          </button>
          <button
            onClick={() => signOut()}
            className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg'
          >
            {t('Sign Out')}
          </button>
        </div>
      </div>
      <Calendar
        localizer={localizer}
        events={occurrences}
        startAccessor='start'
        endAccessor='end'
        style={{ height: 500 }}
        rtl={i18n.language === 'he'}
        selectable
        date={date}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        messages={messages}
        dayPropGetter={dayPropGetter}
        components={{
          toolbar: CustomToolbar,
          month: {
            dateHeader: ({ date, label }) => {
              const hdate = new HDate(date);
              const isSelected =
                selectedDate && moment(date).isSame(selectedDate, 'day');
              return (
                <div className='flex flex-col items-center'>
                  <span>{label}</span>
                  <span
                    className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}
                  >
                    {gematriya(hdate.getDate())}
                  </span>
                </div>
              );
            },
          },
        }}
      />
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ${i18n.language === 'he' ? 'md:grid-flow-col-dense' : ''}`}
      >
        <DayEvents
          events={dayEvents}
          onSelectEvent={handleSelectEvent}
          onAddEvent={() => setIsModalOpen(true)}
          selectedDate={selectedDate}
        />
        <EventDetails
          event={selectedEvent}
          onDelete={handleDeleteEvent}
          onSave={handleSaveEvent}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      </div>
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
              {t('Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
