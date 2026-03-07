'use client';

import { useState } from 'react';
import { callApi, type ApiCallResult } from '../lib/api-client';
import {
  createContactDefault,
  upcomingDatesDefaults,
} from '../lib/demo-defaults';
import EndpointSection from './EndpointSection';
import RequestResponsePanel from './RequestResponsePanel';

type Tab = 'list' | 'create' | 'get' | 'update' | 'delete' | 'upcoming';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'create', label: 'Create' },
  { key: 'get', label: 'Get' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
  { key: 'upcoming', label: 'Upcoming' },
];

interface DemoContactsProps {
  apiKey: string;
}

export default function DemoContacts({ apiKey }: DemoContactsProps) {
  const [tab, setTab] = useState<Tab>('list');
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [createBody, setCreateBody] = useState(
    JSON.stringify(createContactDefault, null, 2),
  );
  const [parseError, setParseError] = useState('');

  // Get/Update/Delete
  const [contactId, setContactId] = useState('');

  // Update body
  const [updateBody, setUpdateBody] = useState(
    JSON.stringify(
      { name: 'David Cohen (Updated)', email: 'david.updated@example.com' },
      null,
      2,
    ),
  );

  // Upcoming params
  const [daysAhead, setDaysAhead] = useState(upcomingDatesDefaults.daysAhead);
  const [limit, setLimit] = useState(upcomingDatesDefaults.limit);

  const sendRequest = async (
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      queryParams?: Record<string, string>;
    },
  ) => {
    setLoading(true);
    try {
      const res = await callApi(endpoint, { ...options, apiKey });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleList = () =>
    sendRequest('/contacts', { queryParams: { limit: '10', offset: '0' } });

  const handleCreate = () => {
    setParseError('');
    let parsed;
    try {
      parsed = JSON.parse(createBody);
    } catch {
      setParseError('Invalid JSON');
      return;
    }
    sendRequest('/contacts', { method: 'POST', body: parsed });
  };

  const handleGet = () => {
    if (!contactId) {
      return;
    }
    sendRequest(`/contacts/${contactId}`, {});
  };

  const handleUpdate = () => {
    if (!contactId) {
      return;
    }
    setParseError('');
    let parsed;
    try {
      parsed = JSON.parse(updateBody);
    } catch {
      setParseError('Invalid JSON');
      return;
    }
    sendRequest(`/contacts/${contactId}`, { method: 'PATCH', body: parsed });
  };

  const handleDelete = () => {
    if (!contactId) {
      return;
    }
    sendRequest(`/contacts/${contactId}`, { method: 'DELETE' });
  };

  const handleUpcoming = () => {
    sendRequest('/contacts/dates/upcoming', {
      queryParams: { daysAhead, limit, offset: '0' },
    });
  };

  const noApiKey = !apiKey;
  const btnClass =
    'px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400 transition-colors';
  const inputClass =
    'w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 dark:text-gray-100';

  return (
    <EndpointSection
      method='POST'
      path='/api/v1/contacts/*'
      description='Contact management (CRUD + upcoming dates)'
      tier='premium'
    >
      <div className='mt-2'>
        <div className='flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 mb-4'>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setResult(null);
              }}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                tab === key
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <div className='space-y-3'>
            <button
              onClick={handleList}
              disabled={loading || noApiKey}
              className={btnClass}
            >
              {loading ? 'Sending...' : 'List Contacts'}
            </button>
          </div>
        )}

        {tab === 'create' && (
          <div className='space-y-3'>
            <textarea
              value={createBody}
              onChange={(e) => setCreateBody(e.target.value)}
              rows={14}
              className={inputClass}
            />
            {parseError && (
              <p className='text-sm text-red-600 dark:text-red-400'>
                {parseError}
              </p>
            )}
            <div className='flex gap-3'>
              <button
                onClick={handleCreate}
                disabled={loading || noApiKey}
                className={btnClass}
              >
                {loading ? 'Sending...' : 'Create Contact'}
              </button>
              <button
                onClick={() =>
                  setCreateBody(JSON.stringify(createContactDefault, null, 2))
                }
                className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors'
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {(tab === 'get' || tab === 'update' || tab === 'delete') && (
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Contact ID
              </label>
              <input
                type='text'
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                placeholder='Enter contact ID from a previous response'
                className={inputClass}
              />
            </div>
            {tab === 'update' && (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Update Body
                </label>
                <textarea
                  value={updateBody}
                  onChange={(e) => setUpdateBody(e.target.value)}
                  rows={5}
                  className={inputClass}
                />
                {parseError && (
                  <p className='text-sm text-red-600 dark:text-red-400'>
                    {parseError}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={
                tab === 'get'
                  ? handleGet
                  : tab === 'update'
                    ? handleUpdate
                    : handleDelete
              }
              disabled={loading || noApiKey || !contactId}
              className={`${btnClass} ${tab === 'delete' ? '!bg-red-600 hover:!bg-red-700 disabled:!bg-red-400' : ''}`}
            >
              {loading
                ? 'Sending...'
                : tab === 'get'
                  ? 'Get Contact'
                  : tab === 'update'
                    ? 'Update Contact'
                    : 'Delete Contact'}
            </button>
          </div>
        )}

        {tab === 'upcoming' && (
          <div className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Days Ahead
                </label>
                <input
                  type='number'
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(e.target.value)}
                  min={1}
                  max={365}
                  className={inputClass}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Limit
                </label>
                <input
                  type='number'
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  min={1}
                  max={1000}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              onClick={handleUpcoming}
              disabled={loading || noApiKey}
              className={btnClass}
            >
              {loading ? 'Sending...' : 'Get Upcoming Dates'}
            </button>
          </div>
        )}

        {noApiKey && (
          <p className='text-xs text-amber-600 dark:text-amber-400 mt-2'>
            API key required (premium tier with contacts scopes)
          </p>
        )}
      </div>
      <RequestResponsePanel result={result} loading={loading} />
    </EndpointSection>
  );
}
