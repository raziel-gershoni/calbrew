'use client'

import { useState, useEffect } from 'react'
import { HDate, gematriya, Locale } from '@hebcal/core'

interface EventFormProps {
  onAddEvent: (event: any) => void
}

export default function EventForm({ onAddEvent }: EventFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hebrew_year, setHebrewYear] = useState(new HDate().getFullYear())
  const [hebrew_month_num, setHebrewMonthNum] = useState(new HDate().getMonth())
  const [hebrew_day, setHebrewDay] = useState(new HDate().getDate())
  const [recurrence_rule, setRecurrenceRule] = useState('yearly')

  const numMonths = HDate.monthsInYear(hebrew_year)
  const yearMonths = Array.from({ length: numMonths }, (_, i) => {
    const monthNum = i + 1
    const hdate = new HDate(1, monthNum, hebrew_year)
    const monthNameEn = hdate.getMonthName()
    const monthNameHe = Locale.gettext(monthNameEn, 'he')
    return { num: monthNum, name: monthNameHe }
  })
  
  const monthDays = new HDate(1, hebrew_month_num, hebrew_year).daysInMonth()

  useEffect(() => {
    if (!yearMonths.find(m => m.num === hebrew_month_num)) {
      setHebrewMonthNum(yearMonths[0].num)
    }
  }, [hebrew_year, yearMonths, hebrew_month_num])

  useEffect(() => {
    if (hebrew_day > monthDays) {
      setHebrewDay(1)
    }
  }, [hebrew_month_num, hebrew_year, monthDays, hebrew_day])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddEvent({ 
      title, 
      description, 
      hebrew_year, 
      hebrew_month: hebrew_month_num, 
      hebrew_day, 
      recurrence_rule 
    })
    setTitle('')
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800">Create New Event</h2>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="hebrew_year" className="block text-sm font-medium text-gray-700">Year</label>
          <div className="flex items-center">
            <button type="button" onClick={() => setHebrewYear(hebrew_year - 1)} className="px-2 py-1 border border-gray-300 rounded-l-md">-</button>
            <input
              id="hebrew_year"
              type="text"
              value={gematriya(hebrew_year)}
              readOnly
              className="text-center w-full px-3 py-2 bg-white border-t border-b border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button type="button" onClick={() => setHebrewYear(hebrew_year + 1)} className="px-2 py-1 border border-gray-300 rounded-r-md">+</button>
          </div>
        </div>
        <div>
          <label htmlFor="hebrew_month" className="block text-sm font-medium text-gray-700">Month</label>
          <select
            id="hebrew_month"
            value={hebrew_month_num}
            onChange={(e) => setHebrewMonthNum(parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {yearMonths.map((month) => (
              <option key={month.num} value={month.num}>{month.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hebrew_day" className="block text-sm font-medium text-gray-700">Day</label>
          <select
            id="hebrew_day"
            value={hebrew_day}
            onChange={(e) => setHebrewDay(parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {Array.from({ length: monthDays }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{gematriya(d)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="recurrence_rule" className="block text-sm font-medium text-gray-700">Recurrence</label>
        <select
          id="recurrence_rule"
          value={recurrence_rule}
          onChange={(e) => setRecurrenceRule(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="yearly">Yearly</option>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Event
      </button>
    </form>
  )
}