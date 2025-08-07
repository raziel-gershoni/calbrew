'use client';

import { useState, createContext, useContext, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showToast = (
    message: string,
    type: Toast['type'] = 'info',
    duration = 5000,
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const showError = (message: string) => showToast(message, 'error', 7000);
  const showSuccess = (message: string) => showToast(message, 'success', 4000);

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles =
      'px-4 py-3 rounded-md shadow-lg max-w-md w-full flex items-center justify-between';

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-l-4 border-green-500`;
      case 'error':
        return `${baseStyles} bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-l-4 border-red-500`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-l-4 border-yellow-500`;
      default:
        return `${baseStyles} bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500`;
    }
  };

  const getIcon = (type: Toast['type']) => {
    const iconClass = 'h-5 w-5';

    switch (type) {
      case 'success':
        return (
          <svg
            className={iconClass}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className={iconClass}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className={iconClass}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        );
      default:
        return (
          <svg
            className={iconClass}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        );
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className='fixed top-4 right-4 z-50 space-y-2'>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${getToastStyles(toast.type)} animate-in slide-in-from-right duration-300`}
            >
              <div className='flex items-center space-x-3'>
                {getIcon(toast.type)}
                <span className='text-sm font-medium'>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className='ml-4 text-current opacity-70 hover:opacity-100'
              >
                <svg
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
