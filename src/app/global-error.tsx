'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'global-error',
        errorDigest: error.digest,
      },
      level: 'fatal',
      contexts: {
        react: {
          componentStack: error.stack,
        },
      },
    });
  }, [error]);

  return (
    <html lang='en'>
      <body>
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
          <div className='max-w-md mx-auto text-center p-6'>
            <div className='mx-auto h-12 w-12 text-red-500'>
              <ExclamationTriangleIcon className='w-12 h-12' />
            </div>
            <h1 className='mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Application Error
            </h1>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              We&apos;re sorry, but something went wrong with the application.
              This error has been reported and we&apos;ll look into it.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className='mt-4 text-left bg-red-50 dark:bg-red-900/20 p-4 rounded-md'>
                <summary className='cursor-pointer font-medium text-red-800 dark:text-red-200'>
                  Error Details (Development Only)
                </summary>
                <pre className='mt-2 text-xs text-red-700 dark:text-red-300 overflow-auto'>
                  {error.toString()}
                  {'\n\n'}
                  {error.stack}
                </pre>
                {error.digest && (
                  <p className='mt-2 text-xs text-red-600 dark:text-red-400'>
                    Error Digest: {error.digest}
                  </p>
                )}
              </details>
            )}

            <div className='mt-6 flex gap-3 justify-center'>
              <button
                onClick={reset}
                className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium'
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className='px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium'
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
