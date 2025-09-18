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
import { useHebrewEvents } from '@/hooks/useHebrewEvents';
import {
  Bars3Icon,
  LanguageIcon,
  CalendarDaysIcon,
  CalendarDateRangeIcon,
  ArrowPathIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

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
  const {
    showHebrewEvents,
    isLoading: isHebrewEventsLoading,
    updateShowHebrewEvents,
  } = useHebrewEvents();
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

  const handleLanguageSelect = (language: 'en' | 'es' | 'he' | 'ru') => {
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

  const handleHebrewEventsToggle = async () => {
    await updateShowHebrewEvents(!showHebrewEvents);
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
        <Bars3Icon className='w-6 h-6 text-gray-600 dark:text-gray-300' />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className='absolute end-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'
        >
          <div className='py-2'>
            {/* Language Section */}
            <div className='px-4 py-2'>
              <div className='flex items-center mb-2'>
                <LanguageIcon className='w-4 h-4 me-2' />
                <div className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  {t('Language')}
                </div>
              </div>
              <div className='flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1'>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  disabled={isLanguageLoading}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    i18n.language === 'en'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageSelect('es')}
                  disabled={isLanguageLoading}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    i18n.language === 'es'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  ES
                </button>
                <button
                  onClick={() => handleLanguageSelect('ru')}
                  disabled={isLanguageLoading}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    i18n.language === 'ru'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => handleLanguageSelect('he')}
                  disabled={isLanguageLoading}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    i18n.language === 'he'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  HE
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className='border-t border-gray-200 dark:border-gray-700 my-1' />

            {/* Calendar Mode Section */}
            <div className='px-4 py-2'>
              <div className='flex items-center mb-2'>
                <CalendarDaysIcon className='w-4 h-4 me-2' />
                <div className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  {t('Calendar View')}
                </div>
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
                <ArrowPathIcon className='w-4 h-4 me-3' />
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

            {/* Hebrew Calendar Events */}
            <button
              onClick={handleHebrewEventsToggle}
              disabled={isHebrewEventsLoading}
              className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors duration-200'
            >
              <div className='flex items-center'>
                <CalendarDateRangeIcon className='w-4 h-4 me-3' />
                {t('Hebrew Calendar Events')}
              </div>
              <div className='relative'>
                <input
                  type='checkbox'
                  checked={showHebrewEvents}
                  onChange={() => {}} // Handled by button onClick
                  className='sr-only'
                />
                <div
                  className={`block w-8 h-4 rounded-full transition-all duration-200 ${
                    isHebrewEventsLoading
                      ? 'bg-purple-400 animate-pulse'
                      : showHebrewEvents
                        ? 'bg-purple-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                ></div>
                <div
                  className={`absolute left-0 top-0 bg-white w-4 h-4 rounded-full transition-all duration-200 shadow flex items-center justify-center ${
                    showHebrewEvents ? 'translate-x-4' : 'translate-x-0'
                  }`}
                >
                  {isHebrewEventsLoading && (
                    <svg
                      className='animate-spin w-2 h-2 text-gray-400'
                      xmlns='http://www.w3.org/2000/svg'
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
              <UserIcon className='w-4 h-4 me-3' />
              {t('User Profile')}
            </button>

            {/* Sign Out - No divider between profile and signout */}
            <button
              onClick={handleSignOut}
              className='w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors duration-200'
            >
              <ArrowRightOnRectangleIcon className='w-4 h-4 me-3' />
              {t('Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
