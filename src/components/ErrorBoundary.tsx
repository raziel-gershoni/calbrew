'use client';

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to logging service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
          <div className='max-w-md mx-auto text-center'>
            <div className='mx-auto h-12 w-12 text-red-500'>
              <ExclamationTriangleIcon className='w-12 h-12' />
            </div>
            <h1 className='mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Something went wrong
            </h1>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              We&apos;re sorry, but something unexpected happened. Please try
              refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='mt-4 text-left bg-red-50 dark:bg-red-900/20 p-4 rounded-md'>
                <summary className='cursor-pointer font-medium text-red-800 dark:text-red-200'>
                  Error Details (Development Only)
                </summary>
                <pre className='mt-2 text-xs text-red-700 dark:text-red-300 overflow-auto'>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className='mt-6 flex gap-3 justify-center'>
              <button
                onClick={this.resetError}
                className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium'
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className='px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium'
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
