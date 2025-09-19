'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';

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
  const { i18n } = useTranslation();
  const isRTL = getTextDirection(i18n.language) === 'rtl';

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
        return <CheckIcon className={iconClass} />;
      case 'error':
        return <XMarkIcon className={iconClass} />;
      case 'warning':
        return <ExclamationTriangleIcon className={iconClass} />;
      default:
        return <InformationCircleIcon className={iconClass} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          className={`fixed top-4 z-50 space-y-2 ${isRTL ? 'left-4' : 'right-4'}`}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${getToastStyles(toast.type)} animate-in duration-300 ${isRTL ? 'slide-in-from-left' : 'slide-in-from-right'}`}
            >
              <div
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}
              >
                {getIcon(toast.type)}
                <span className='text-sm font-medium'>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className={`text-current opacity-70 hover:opacity-100 ${isRTL ? 'mr-4' : 'ml-4'}`}
              >
                <XMarkIcon className='h-4 w-4' />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
