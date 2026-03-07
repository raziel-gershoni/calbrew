'use client';

import type { ApiCallResult } from '../lib/api-client';
import CodeBlock from './CodeBlock';

interface RequestResponsePanelProps {
  result: ApiCallResult | null;
  loading?: boolean;
}

export default function RequestResponsePanel({
  result,
  loading,
}: RequestResponsePanelProps) {
  if (loading) {
    return (
      <div className='flex items-center justify-center py-8 text-gray-500 dark:text-gray-400'>
        <svg
          className='animate-spin h-5 w-5 mr-2'
          viewBox='0 0 24 24'
          fill='none'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          />
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
          />
        </svg>
        Sending request...
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const { request, response } = result;
  const isSuccess = response.status >= 200 && response.status < 300;

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
      <div>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          Request
        </h4>
        <CodeBlock
          data={{
            method: request.method,
            url: request.url,
            headers: request.headers,
            ...(request.body !== undefined && { body: request.body }),
          }}
        />
      </div>
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Response
          </h4>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
              isSuccess
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}
          >
            {response.status} {response.statusText}
          </span>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {response.durationMs}ms
          </span>
        </div>
        <CodeBlock data={response.body} />
        {Object.keys(response.headers).length > 0 && (
          <div className='mt-2'>
            <h5 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>
              Rate Limit Headers
            </h5>
            <CodeBlock data={response.headers} maxHeight='max-h-24' />
          </div>
        )}
      </div>
    </div>
  );
}
