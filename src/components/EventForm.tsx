'use client';

import { useState, useEffect } from 'react';
import { HDate, Locale } from '@hebcal/core';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';
import { useGcalSync } from '@/hooks/useGcalSync';
import UnifiedDatePicker from './UnifiedDatePicker';

interface EventFormProps {
  onAddEvent: (event: Omit<Event, 'id'>) => void;
  isCreating: boolean;
  selectedDate: Date | null;
  onDateChange?: (date: Date) => void;
  onFormReset?: () => void;
}

export default function EventForm({
  onAddEvent,
  isCreating,
  selectedDate,
  onDateChange,
  onFormReset,
}: EventFormProps) {
  const { t, i18n } = useTranslation();
  const { syncEnabled: userSyncEnabled } = useGcalSync();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hebrew_year, setHebrewYear] = useState(new HDate().getFullYear());
  const [hebrew_month_num, setHebrewMonthNum] = useState(
    new HDate().getMonth(),
  );
  const [hebrew_day, setHebrewDay] = useState(new HDate().getDate());
  const [recurrence_rule, _setRecurrenceRule] = useState('yearly');
  const [syncWithGcal, setSyncWithGcal] = useState(userSyncEnabled);

  useEffect(() => {
    if (selectedDate) {
      const hdate = new HDate(selectedDate);
      setHebrewYear(hdate.getFullYear());
      setHebrewMonthNum(hdate.getMonth());
      setHebrewDay(hdate.getDate());
    }
  }, [selectedDate]);

  useEffect(() => {
    setSyncWithGcal(userSyncEnabled);
  }, [userSyncEnabled]);

  // Reset form when parent requests it
  const _resetForm = () => {
    setTitle('');
    setDescription('');
    setSyncWithGcal(userSyncEnabled);
  };

  // Expose reset function via callback
  useEffect(() => {
    if (onFormReset) {
      onFormReset();
    }
  }, [onFormReset]);

  // Reset form is handled via useEffect callback

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
      sync_with_gcal: syncWithGcal,
    });
    // Don't clear form immediately - keep data visible until modal closes
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 max-w-lg mx-auto bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md text-start'
    >
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
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 text-start`}
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
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 text-start`}
        />
      </div>
      {/* Date Picker Section */}
      <div>
        {/* Date Picker */}
        <div className='bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3'>
          <UnifiedDatePicker
            selectedDate={selectedDate || new Date()}
            onDateChange={(newDate) => {
              const hdate = new HDate(newDate);
              setHebrewYear(hdate.getFullYear());
              setHebrewMonthNum(hdate.getMonth());
              setHebrewDay(hdate.getDate());
              // Update parent component's selectedDate
              if (onDateChange) {
                onDateChange(newDate);
              }
            }}
            className='justify-center'
          />
        </div>
      </div>
      {/* Recurrence dropdown hidden for now - functionality not implemented */}
      {/*
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
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100 text-start`}
        >
          <option value='yearly'>{t('Yearly')}</option>
          <option value='monthly'>{t('Monthly')}</option>
          <option value='weekly'>{t('Weekly')}</option>
        </select>
      </div>
      */}

      {/* Google Calendar Sync Checkbox */}
      <div className='flex items-center'>
        <input
          id='syncWithGcal'
          type='checkbox'
          checked={syncWithGcal}
          onChange={(e) => setSyncWithGcal(e.target.checked)}
          className='h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800'
        />
        <label
          htmlFor='syncWithGcal'
          className='ms-2 block text-sm text-gray-700 dark:text-gray-300'
        >
          {t('Sync with Google Calendar')}
        </label>
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
