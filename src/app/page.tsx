'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import EventForm from '@/components/EventForm'
import EventList from '@/components/EventList'

interface Event {
  id: string;
  title: string;
  description: string;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
}

export default function Home() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<Event[]>([])

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

  const handleAddEvent = async (event: any) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })
    fetchEvents() // Refetch events after adding
  }

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, {
      method: 'DELETE'
    })
    fetchEvents() // Refetch events after deleting
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-4xl font-bold mb-4">Welcome to Calbrew</h1>
        <p className="text-lg mb-8">Your Hebrew Calendar Event Manager</p>
        <button 
          onClick={() => signIn('google')} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Calbrew</h1>
          <button 
            onClick={() => signOut()} 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="mb-10">
            <EventForm onAddEvent={handleAddEvent} />
          </div>
          <EventList events={events} onDelete={handleDeleteEvent} />
        </div>
      </main>
    </div>
  )
}