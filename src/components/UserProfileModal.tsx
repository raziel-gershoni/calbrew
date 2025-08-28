'use client';

import { useTranslation } from 'react-i18next';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4'>
      <div
        ref={modalRef}
        className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto'
      >
        {/* Header */}
        <div className='flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
            {t('User Profile')}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
            aria-label={t('Close')}
          >
            <svg
              className='w-6 h-6'
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {session?.user && (
            <div className='space-y-6'>
              {/* User Avatar */}
              {session.user.image && (
                <div className='flex justify-center'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.user.image}
                    alt={session.user.name || t('User Avatar')}
                    className='w-20 h-20 rounded-full border-4 border-gray-200 dark:border-gray-700'
                  />
                </div>
              )}

              {/* User Information */}
              <div className='space-y-4'>
                {/* Name */}
                {session.user.name && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t('Name')}
                    </label>
                    <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white'>
                      {session.user.name}
                    </div>
                  </div>
                )}

                {/* Email */}
                {session.user.email && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t('Email')}
                    </label>
                    <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white break-all'>
                      {session.user.email}
                    </div>
                  </div>
                )}

                {/* Account Provider */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t('Account Provider')}
                  </label>
                  <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center'>
                    <svg
                      className='w-5 h-5 me-2 text-blue-600'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                      <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                      <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                      <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                    </svg>
                    Google
                  </div>
                </div>

                {/* Session Info */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t('Session Status')}
                  </label>
                  <div className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-800 dark:text-green-300 flex items-center'>
                    <svg
                      className='w-4 h-4 me-2'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                        clipRule='evenodd'
                      />
                    </svg>
                    {t('Active')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors'
          >
            {t('Close')}
          </button>
          <button
            onClick={handleSignOut}
            className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center'
          >
            <svg
              className='w-4 h-4 me-2'
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
            </svg>
            {t('Sign Out')}
          </button>
        </div>
      </div>
    </div>
  );
}
