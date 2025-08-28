'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useCalendarMode,
  type CalendarMode,
} from '@/contexts/CalendarModeContext';
import { useGcalSync } from '@/hooks/useGcalSync';

interface HamburgerMenuProps {
  onOpenProfile?: () => void;
  className?: string;
}

export default function HamburgerMenu({
  onOpenProfile,
  className = '',
}: HamburgerMenuProps) {
  const { t, i18n } = useTranslation();
  const { changeLanguage, isLoading: isLanguageLoading } = useLanguage();
  const {
    calendarMode,
    setCalendarMode,
    isLoading: isCalendarModeLoading,
  } = useCalendarMode();
  const {
    syncEnabled,
    isLoading: isSyncLoading,
    updateSyncPreference,
  } = useGcalSync();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageSelect = (language: 'en' | 'es' | 'he') => {
    changeLanguage(language);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };

  const handleCalendarModeChange = (mode: CalendarMode) => {
    setCalendarMode(mode);
    setIsOpen(false);
  };

  const handleSyncToggle = async () => {
    await updateSyncPreference(!syncEnabled);
    // Keep hamburger open so user can see the process
  };

  const handleOpenProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
    }
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hamburger Button */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className='p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300'
        aria-label={t('Menu')}
        aria-expanded={isOpen}
      >
        <svg
          className='w-6 h-6 text-gray-600 dark:text-gray-300'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path d='M4 6h16M4 12h16M4 18h16' />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className='absolute end-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'
        >
          <div className='py-2'>
            {/* English */}
            <button
              onClick={() => handleLanguageSelect('en')}
              disabled={isLanguageLoading}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200 ${
                i18n.language === 'en'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <svg
                className='w-4 h-4 me-3'
                fill='none'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path d='M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' />
              </svg>
              {i18n.language === 'en' && (
                <svg
                  className='w-3 h-3 me-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
              English
            </button>

            {/* Spanish */}
            <button
              onClick={() => handleLanguageSelect('es')}
              disabled={isLanguageLoading}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200 ${
                i18n.language === 'es'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <svg
                className='w-4 h-4 me-3'
                fill='none'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path d='M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' />
              </svg>
              {i18n.language === 'es' && (
                <svg
                  className='w-3 h-3 me-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
              Español
            </button>

            {/* Hebrew */}
            <button
              onClick={() => handleLanguageSelect('he')}
              disabled={isLanguageLoading}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200 ${
                i18n.language === 'he'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <svg
                className='w-4 h-4 me-3'
                fill='none'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path d='M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' />
              </svg>
              {i18n.language === 'he' && (
                <svg
                  className='w-3 h-3 me-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
              {t('Hebrew')}
            </button>

            {/* Divider */}
            <div className='border-t border-gray-200 dark:border-gray-700 my-1' />

            {/* Calendar Mode Section */}
            <div className='px-4 py-2'>
              <div className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2'>
                {t('Calendar View')}
              </div>
              <div className='flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1'>
                <button
                  onClick={() => handleCalendarModeChange('hebrew')}
                  disabled={isCalendarModeLoading}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    calendarMode === 'hebrew'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  <svg
                    className='w-3 h-3 mx-auto mb-1'
                    fill='none'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                  </svg>
                  {t('Hebrew Calendar')}
                </button>
                <button
                  onClick={() => handleCalendarModeChange('gregorian')}
                  disabled={isCalendarModeLoading}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    calendarMode === 'gregorian'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  <svg
                    className='w-3 h-3 mx-auto mb-1'
                    fill='none'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                  </svg>
                  {t('Gregorian')}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className='border-t border-gray-200 dark:border-gray-700 my-1' />

            {/* Google Calendar Sync */}
            <button
              onClick={handleSyncToggle}
              disabled={isSyncLoading}
              className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 me-3'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                </svg>
                {t('Google Sync')}
              </div>
              <div className='relative'>
                <input
                  type='checkbox'
                  checked={syncEnabled}
                  onChange={() => {}} // Handled by button onClick
                  className='sr-only'
                />
                <div
                  className={`block w-8 h-4 rounded-full transition-all duration-200 ${
                    isSyncLoading
                      ? 'bg-blue-400 animate-pulse'
                      : syncEnabled
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                ></div>
                <div
                  className={`absolute left-0 top-0 bg-white w-4 h-4 rounded-full transition-all duration-200 shadow flex items-center justify-center ${
                    syncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                >
                  {isSyncLoading && (
                    <svg
                      className='w-2 h-2 animate-spin text-blue-600'
                      fill='none'
                      viewBox='0 0 24 24'
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
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className='border-t border-gray-200 dark:border-gray-700 my-1' />

            {/* User Profile */}
            <button
              onClick={handleOpenProfile}
              className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors duration-200'
            >
              <svg
                className='w-4 h-4 me-3'
                fill='none'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
              {t('User Profile')}
            </button>

            {/* Sign Out - No divider between profile and signout */}
            <button
              onClick={handleSignOut}
              className='w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors duration-200'
            >
              <svg
                className='w-4 h-4 me-3'
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
      )}
    </div>
  );
}
