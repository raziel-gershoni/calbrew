'use client';

import { useState } from 'react';
import { callApi, type ApiCallResult } from '../lib/api-client';
import { holidaysDefaults } from '../lib/demo-defaults';
import EndpointSection from './EndpointSection';
import RequestResponsePanel from './RequestResponsePanel';

const HOLIDAY_TYPES = [
  'majorHolidays',
  'minorHolidays',
  'fastDays',
  'roshChodesh',
  'modernHolidays',
  'torahReadings',
  'specialShabbat',
  'omerCount',
] as const;

interface DemoHolidaysProps {
  apiKey: string;
}

export default function DemoHolidays({ apiKey }: DemoHolidaysProps) {
  const [startDate, setStartDate] = useState(holidaysDefaults.startDate);
  const [endDate, setEndDate] = useState(holidaysDefaults.endDate);
  const [types, setTypes] = useState<string[]>([...holidaysDefaults.types]);
  const [language, setLanguage] = useState<'en' | 'he'>(
    holidaysDefaults.language,
  );
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleType = (type: string) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSend = async () => {
    const queryParams: Record<string, string> = {
      startDate,
      endDate,
      language,
    };
    if (types.length > 0) {
      queryParams.types = types.join(',');
    }
    setLoading(true);
    try {
      const res = await callApi('/dates/holidays', {
        method: 'GET',
        apiKey,
        queryParams,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    setStartDate(holidaysDefaults.startDate);
    setEndDate(holidaysDefaults.endDate);
    setTypes([...holidaysDefaults.types]);
    setLanguage(holidaysDefaults.language);
  };

  return (
    <EndpointSection
      method='GET'
      path='/api/v1/dates/holidays'
      description='List holidays in a date range'
      tier='basic'
    >
      <div className='mt-2 space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Start Date
            </label>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 dark:text-gray-100'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              End Date
            </label>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 dark:text-gray-100'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
              className='w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 dark:text-gray-100'
            >
              <option value='en'>English</option>
              <option value='he'>Hebrew</option>
            </select>
          </div>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Holiday Types
          </label>
          <div className='flex flex-wrap gap-2'>
            {HOLIDAY_TYPES.map((type) => (
              <label
                key={type}
                className='flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300'
              >
                <input
                  type='checkbox'
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                  className='h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800'
                />
                {type}
              </label>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={handleSend}
            disabled={loading || !apiKey}
            className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400 transition-colors'
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
          <button
            onClick={resetDefaults}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors'
          >
            Reset
          </button>
          {!apiKey && (
            <span className='text-xs text-amber-600 dark:text-amber-400'>
              API key required
            </span>
          )}
        </div>
      </div>
      <RequestResponsePanel result={result} loading={loading} />
    </EndpointSection>
  );
}
