'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { callApi } from '../lib/api-client';

type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyInput({
  apiKey,
  onApiKeyChange,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMsg('Please enter an API key');
      return;
    }
    setStatus('checking');
    setErrorMsg('');
    try {
      const result = await callApi('/health', { apiKey });
      if (result.response.status === 200) {
        setStatus('connected');
      } else {
        setStatus('error');
        setErrorMsg(`Status ${result.response.status}`);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error');
    }
  };

  const statusIndicator = {
    idle: null,
    checking: (
      <span className='text-sm text-gray-500 dark:text-gray-400'>
        Checking...
      </span>
    ),
    connected: (
      <span className='text-sm text-green-600 dark:text-green-400 flex items-center gap-1'>
        <span className='w-2 h-2 rounded-full bg-green-500 inline-block' />
        Connected
      </span>
    ),
    error: (
      <span className='text-sm text-red-600 dark:text-red-400'>
        {errorMsg || 'Error'}
      </span>
    ),
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
        API Key
      </label>
      <p className='text-xs text-gray-500 dark:text-gray-400 mb-3'>
        Enter your Calbrew API key (starts with{' '}
        <code className='font-mono'>cb_test_</code> or{' '}
        <code className='font-mono'>cb_live_</code>). The health check endpoint
        works without authentication.
      </p>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              onApiKeyChange(e.target.value);
              if (status !== 'idle') {
                setStatus('idle');
              }
            }}
            placeholder='cb_test_...'
            className='w-full px-3 py-2 pr-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 dark:text-gray-100'
          />
          <button
            type='button'
            onClick={() => setShowKey(!showKey)}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          >
            {showKey ? (
              <EyeSlashIcon className='w-4 h-4' />
            ) : (
              <EyeIcon className='w-4 h-4' />
            )}
          </button>
        </div>
        <button
          onClick={testConnection}
          disabled={status === 'checking'}
          className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400 transition-colors'
        >
          Test Connection
        </button>
      </div>
      {statusIndicator[status] && (
        <div className='mt-2'>{statusIndicator[status]}</div>
      )}
    </div>
  );
}
