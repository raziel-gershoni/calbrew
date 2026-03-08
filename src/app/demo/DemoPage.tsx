'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ApiKeyInput from './components/ApiKeyInput';
import DemoHealthCheck from './components/DemoHealthCheck';
import DemoDateConvert from './components/DemoDateConvert';
import DemoDateOccurrences from './components/DemoDateOccurrences';
import DemoHolidays from './components/DemoHolidays';
import DemoContacts from './components/DemoContacts';
import DemoWebhooks from './components/DemoWebhooks';

export default function DemoPage() {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-5xl mx-auto px-4 py-8'>
        <header className='mb-8'>
          <Link
            href='/developer'
            className='inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-4'
          >
            <ArrowLeftIcon className='w-4 h-4' />
            {t('Developer')}
          </Link>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Calbrew B2B API Explorer
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            Try each endpoint with pre-filled examples. Enter your API key to
            authenticate requests. The health check works without
            authentication.
          </p>
        </header>

        <div className='space-y-6'>
          <ApiKeyInput apiKey={apiKey} onApiKeyChange={setApiKey} />

          {/* Health */}
          <section>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3'>
              Health
            </h2>
            <DemoHealthCheck />
          </section>

          {/* Tier 1: Date Utilities */}
          <section>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3'>
              Date Utilities
              <span className='ml-2 text-xs font-normal px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'>
                basic tier
              </span>
            </h2>
            <div className='space-y-3'>
              <DemoDateConvert apiKey={apiKey} />
              <DemoDateOccurrences apiKey={apiKey} />
              <DemoHolidays apiKey={apiKey} />
            </div>
          </section>

          {/* Tier 2: Contacts */}
          <section>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3'>
              Contacts
              <span className='ml-2 text-xs font-normal px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'>
                premium tier
              </span>
            </h2>
            <DemoContacts apiKey={apiKey} />
          </section>

          {/* Tier 2: Webhooks */}
          <section>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3'>
              Webhooks
              <span className='ml-2 text-xs font-normal px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'>
                premium tier
              </span>
            </h2>
            <DemoWebhooks apiKey={apiKey} />
          </section>
        </div>
      </div>
    </div>
  );
}
