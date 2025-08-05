'use client';

import { useState, useEffect } from 'react';
import { HDate, gematriya, Locale } from '@hebcal/core';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';

interface EventFormProps {
  onAddEvent: (event: Omit<Event, 'id'>) => void;
  isCreating: boolean;
  selectedDate: Date | null;
}

export default function EventForm({
  onAddEvent,
  isCreating,
  selectedDate,
}: EventFormProps) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hebrew_year, setHebrewYear] = useState(new HDate().getFullYear());
  const [hebrew_month_num, setHebrewMonthNum] = useState(
    new HDate().getMonth(),
  );
  const [hebrew_day, setHebrewDay] = useState(new HDate().getDate());
  const [recurrence_rule, setRecurrenceRule] = useState('yearly');

  useEffect(() => {
    if (selectedDate) {
      const hdate = new HDate(selectedDate);
      setHebrewYear(hdate.getFullYear());
      setHebrewMonthNum(hdate.getMonth());
      setHebrewDay(hdate.getDate());
    }
  }, [selectedDate]);

  const numMonths = HDate.monthsInYear(hebrew_year);
  const yearMonths = Array.from({ length: numMonths }, (_, i) => {
    const monthNum = i + 1;
    const hdate = new HDate(1, monthNum, hebrew_year);
    const monthNameEn = hdate.getMonthName();
    const monthNameHe = Locale.gettext(monthNameEn, 'he');
    return {
      num: monthNum,
      name: i18n.language === 'he' ? monthNameHe : monthNameEn,
    };
  });

  const monthDays = new HDate(1, hebrew_month_num, hebrew_year).daysInMonth();

  useEffect(() => {
    if (!yearMonths.find((m) => m.num === hebrew_month_num)) {
      setHebrewMonthNum(yearMonths[0].num);
    }
  }, [hebrew_year, yearMonths, hebrew_month_num]);

  useEffect(() => {
    if (hebrew_day > monthDays) {
      setHebrewDay(1);
    }
  }, [hebrew_month_num, hebrew_year, monthDays, hebrew_day]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent({
      title,
      description,
      hebrew_year,
      hebrew_month: hebrew_month_num,
      hebrew_day,
      recurrence_rule,
    });
    setTitle('');
    setDescription('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 max-w-lg mx-auto bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
    >
      <h2 className='text-2xl font-bold text-center text-gray-800 dark:text-gray-200'>
        {t('Create New Event')}
      </h2>
      <div>
        <label
          htmlFor='title'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {t('Title')}
        </label>
        <input
          id='title'
          type='text'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
        />
      </div>
      <div>
        <label
          htmlFor='description'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {t('Description')}
        </label>
        <textarea
          id='description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
        />
      </div>
      <div className='grid grid-cols-3 gap-4'>
        <div>
          <label
            htmlFor='hebrew_year'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            {t('Year')}
          </label>
          <div className='flex items-center'>
            <button
              type='button'
              onClick={() => setHebrewYear(hebrew_year - 1)}
              className='px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-700 dark:text-gray-300'
            >
              -
            </button>
            <input
              id='hebrew_year'
              type='text'
              value={
                i18n.language === 'he' ? gematriya(hebrew_year) : hebrew_year
              }
              readOnly
              className='text-center w-full px-3 py-2 bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100'
            />
            <button
              type='button'
              onClick={() => setHebrewYear(hebrew_year + 1)}
              className='px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-r-md text-gray-700 dark:text-gray-300'
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor='hebrew_month'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            {t('Month')}
          </label>
          <select
            id='hebrew_month'
            value={hebrew_month_num}
            onChange={(e) => setHebrewMonthNum(parseInt(e.target.value))}
            className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
          >
            {yearMonths.map((month) => (
              <option key={month.num} value={month.num}>
                {month.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor='hebrew_day'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            {t('Day')}
          </label>
          <select
            id='hebrew_day'
            value={hebrew_day}
            onChange={(e) => setHebrewDay(parseInt(e.target.value))}
            className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
          >
            {Array.from({ length: monthDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {i18n.language === 'he' ? gematriya(d) : d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor='recurrence_rule'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {t('Recurrence')}
        </label>
        <select
          id='recurrence_rule'
          value={recurrence_rule}
          onChange={(e) => setRecurrenceRule(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 ${i18n.language === 'he' ? 'text-right' : 'text-left'}`}
        >
          <option value='yearly'>{t('Yearly')}</option>
          <option value='monthly'>{t('Monthly')}</option>
          <option value='weekly'>{t('Weekly')}</option>
        </select>
      </div>
      <button
        type='submit'
        disabled={isCreating}
        className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400'
      >
        {isCreating ? t('Creating...') : t('Add Event')}
      </button>
    </form>
  );
}
