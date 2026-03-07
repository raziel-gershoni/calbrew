'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface EndpointSectionProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  tier?: 'free' | 'basic' | 'premium';
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PATCH:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  basic:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

export default function EndpointSection({
  method,
  path,
  description,
  tier = 'basic',
  children,
  defaultOpen = false,
}: EndpointSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
      <button
        onClick={() => setOpen(!open)}
        className='w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors'
      >
        {open ? (
          <ChevronDownIcon className='w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0' />
        ) : (
          <ChevronRightIcon className='w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0' />
        )}
        <span
          className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${METHOD_COLORS[method]}`}
        >
          {method}
        </span>
        <code className='text-sm font-mono text-gray-800 dark:text-gray-200'>
          {path}
        </code>
        <span className={`text-xs px-2 py-0.5 rounded ${TIER_COLORS[tier]}`}>
          {tier}
        </span>
        <span className='text-sm text-gray-500 dark:text-gray-400 ml-auto hidden sm:block'>
          {description}
        </span>
      </button>
      {open && (
        <div className='px-4 pb-4 border-t border-gray-100 dark:border-gray-700'>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-3 mb-4 sm:hidden'>
            {description}
          </p>
          {children}
        </div>
      )}
    </div>
  );
}
