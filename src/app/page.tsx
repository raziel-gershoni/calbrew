'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { HDate, months } from '@hebcal/core';

interface Event {
  id: string;
  title: string;
  description: string;
  hebrew_year: number;
  hebrew_month: string;
  hebrew_day: number;
  recurrence_rule: string;
}

export default function Home() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hebrew_year, setHebrewYear] = useState(new HDate().getFullYear())
  const [hebrew_month, setHebrewMonth] = useState('Nisan')
  const [hebrew_day, setHebrewDay] = useState(1)
  const [recurrence_rule, setRecurrenceRule] = useState('yearly')

  const fetchEvents = () => {
    if (status === 'authenticated') {
      fetch('/api/events')
        .then(res => res.json())
        .then((data: Event[]) => setEvents(data))
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [status])

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const newEvent = { title, description, hebrew_year, hebrew_month, hebrew_day, recurrence_rule }
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newEvent)
    })
    fetchEvents()
  }

  const deleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, {
      method: 'DELETE'
    })
    setEvents(events.filter(event => event.id !== id))
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    return (
      <div>
        <h1>Please sign in to continue</h1>
        <button onClick={() => signIn('google')}>Sign in with Google</button>
      </div>
    )
  }

  const monthNames = Object.keys(months);

  return (
    <div>
      <button onClick={() => signOut()}>Sign Out</button>
      <h1>Hebrew Calendar Events</h1>
      <form onSubmit={addEvent}>
        <input 
          type="text" 
          placeholder="Event Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
        />
        <textarea 
          placeholder="Description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />
        <input 
          type="number" 
          placeholder="Hebrew Year" 
          value={hebrew_year} 
          onChange={(e) => setHebrewYear(parseInt(e.target.value))} 
          required 
        />
        <select value={hebrew_month} onChange={(e) => setHebrewMonth(e.target.value)}>
          {monthNames.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input 
          type="number" 
          placeholder="Hebrew Day" 
          value={hebrew_day} 
          onChange={(e) => setHebrewDay(parseInt(e.target.value))} 
          required 
          min="1" 
          max="30" 
        />
        <select value={recurrence_rule} onChange={(e) => setRecurrenceRule(e.target.value)}>
          <option value="yearly">Yearly</option>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        <button type="submit">Add Event</button>
      </form>
      <ul>
        {events && events.map(event => (
          <li key={event.id}>
            {event.title} - {event.hebrew_day} {event.hebrew_month} {event.hebrew_year}
            <button onClick={() => deleteEvent(event.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}