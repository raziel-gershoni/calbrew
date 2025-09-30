/**
 * Notification Context
 * Provides toast-style notifications throughout the app
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    title: string,
    message?: string,
    duration?: number,
  ) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message?: string,
      duration: number = 5000,
    ) => {
      const id = Math.random().toString(36).substring(7);
      const notification: Notification = { id, type, title, message, duration };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification],
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addNotification('success', title, message);
    },
    [addNotification],
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addNotification('error', title, message, 7000); // Errors stay longer
    },
    [addNotification],
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addNotification('warning', title, message);
    },
    [addNotification],
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addNotification('info', title, message);
    },
    [addNotification],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({
  notifications,
  onRemove,
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className='fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none'>
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onRemove,
}: {
  notification: Notification;
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className='w-5 h-5 text-green-600' />;
      case 'error':
        return <XCircleIcon className='w-5 h-5 text-red-600' />;
      case 'warning':
        return <ExclamationTriangleIcon className='w-5 h-5 text-yellow-600' />;
      case 'info':
        return <InformationCircleIcon className='w-5 h-5 text-blue-600' />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`${getStyles()} border rounded-lg shadow-lg p-4 pointer-events-auto animate-slide-in-right`}
    >
      <div className='flex items-start space-x-3'>
        <div className='flex-shrink-0'>{getIcon()}</div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
            {notification.title}
          </p>
          {notification.message && (
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
              {notification.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className='flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
        >
          <XMarkIcon className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}
