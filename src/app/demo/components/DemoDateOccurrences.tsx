'use client';

import { useState } from 'react';
import { callApi, type ApiCallResult } from '../lib/api-client';
import { occurrencesDefault } from '../lib/demo-defaults';
import EndpointSection from './EndpointSection';
import RequestResponsePanel from './RequestResponsePanel';

interface DemoDateOccurrencesProps {
  apiKey: string;
}

export default function DemoDateOccurrences({
  apiKey,
}: DemoDateOccurrencesProps) {
  const [body, setBody] = useState(JSON.stringify(occurrencesDefault, null, 2));
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  const handleSend = async () => {
    setParseError('');
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      setParseError('Invalid JSON');
      return;
    }
    setLoading(true);
    try {
      const res = await callApi('/dates/occurrences', {
        method: 'POST',
        body: parsed,
        apiKey,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EndpointSection
      method='POST'
      path='/api/v1/dates/occurrences'
      description='Find Gregorian occurrences of Hebrew dates'
      tier='basic'
    >
      <div className='mt-2 space-y-3'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Request Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className='w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 dark:text-gray-100'
          />
          {parseError && (
            <p className='text-sm text-red-600 dark:text-red-400 mt-1'>
              {parseError}
            </p>
          )}
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
            onClick={() => setBody(JSON.stringify(occurrencesDefault, null, 2))}
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
