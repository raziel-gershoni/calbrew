'use client';

import { useState } from 'react';
import { callApi, type ApiCallResult } from '../lib/api-client';
import { createWebhookDefault } from '../lib/demo-defaults';
import EndpointSection from './EndpointSection';
import RequestResponsePanel from './RequestResponsePanel';

type Tab = 'list' | 'create' | 'test';

const TABS: { key: Tab; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'create', label: 'Create' },
  { key: 'test', label: 'Test' },
];

interface DemoWebhooksProps {
  apiKey: string;
}

export default function DemoWebhooks({ apiKey }: DemoWebhooksProps) {
  const [tab, setTab] = useState<Tab>('list');
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [createBody, setCreateBody] = useState(
    JSON.stringify(createWebhookDefault, null, 2),
  );
  const [parseError, setParseError] = useState('');

  // Test form
  const [webhookId, setWebhookId] = useState('');

  const sendRequest = async (
    endpoint: string,
    options: { method?: string; body?: unknown },
  ) => {
    setLoading(true);
    try {
      const res = await callApi(endpoint, { ...options, apiKey });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleList = () => sendRequest('/webhooks', {});

  const handleCreate = () => {
    setParseError('');
    let parsed;
    try {
      parsed = JSON.parse(createBody);
    } catch {
      setParseError('Invalid JSON');
      return;
    }
    sendRequest('/webhooks', { method: 'POST', body: parsed });
  };

  const handleTest = () => {
    if (!webhookId) {
      return;
    }
    sendRequest('/webhooks/test', {
      method: 'POST',
      body: { webhookId },
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
      path='/api/v1/webhooks/*'
      description='Webhook management and testing'
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
          <button
            onClick={handleList}
            disabled={loading || noApiKey}
            className={btnClass}
          >
            {loading ? 'Sending...' : 'List Webhooks'}
          </button>
        )}

        {tab === 'create' && (
          <div className='space-y-3'>
            <textarea
              value={createBody}
              onChange={(e) => setCreateBody(e.target.value)}
              rows={8}
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
                {loading ? 'Sending...' : 'Create Webhook'}
              </button>
              <button
                onClick={() =>
                  setCreateBody(JSON.stringify(createWebhookDefault, null, 2))
                }
                className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors'
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {tab === 'test' && (
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Webhook ID
              </label>
              <input
                type='text'
                value={webhookId}
                onChange={(e) => setWebhookId(e.target.value)}
                placeholder='Enter webhook ID from a previous response'
                className={inputClass}
              />
            </div>
            <button
              onClick={handleTest}
              disabled={loading || noApiKey || !webhookId}
              className={btnClass}
            >
              {loading ? 'Sending...' : 'Send Test Event'}
            </button>
          </div>
        )}

        {noApiKey && (
          <p className='text-xs text-amber-600 dark:text-amber-400 mt-2'>
            API key required (premium tier with webhooks scopes)
          </p>
        )}
      </div>
      <RequestResponsePanel result={result} loading={loading} />
    </EndpointSection>
  );
}
