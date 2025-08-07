'use client';

import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  message,
  size = 'md',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'
    : 'flex items-center justify-center';

  const defaultMessage = message || t('Loading your events...');

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className='text-center'>
        <div
          className={`mx-auto ${sizeClasses[size]} animate-spin rounded-full border-4 border-blue-500 border-t-transparent`}
        ></div>
        {defaultMessage && (
          <p
            className={`mt-4 ${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}
          >
            {defaultMessage}
          </p>
        )}
      </div>
    </div>
  );
}
