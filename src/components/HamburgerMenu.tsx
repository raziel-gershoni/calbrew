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
import { useDailyLearning } from '@/hooks/useDailyLearning';
import { useHebrewCalendarPreferences } from '@/hooks/useHebrewCalendarPreferences';
import { useDailyLearningPreferences } from '@/hooks/useDailyLearningPreferences';
import {
  HEBREW_CALENDAR_EVENT_TYPE_KEYS,
  DAILY_LEARNING_TYPE_KEYS,
} from '@/types/hebrewEventPreferences';
import {
  Bars3Icon,
  LanguageIcon,
  CalendarDaysIcon,
  CalendarDateRangeIcon,
  ArrowPathIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  CheckIcon,
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
  const {
    showDailyLearning,
    isLoading: isDailyLearningLoading,
    updateShowDailyLearning,
  } = useDailyLearning();
  const {
    preferences: calendarPreferences,
    isLoading: isCalendarPreferencesLoading,
    updatePreference: updateCalendarPreference,
  } = useHebrewCalendarPreferences();
  const {
    preferences: learningPreferences,
    isLoading: isLearningPreferencesLoading,
    updatePreference: updateLearningPreference,
  } = useDailyLearningPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [isHebrewEventsExpanded, setIsHebrewEventsExpanded] = useState(false);
  const [isDailyLearningExpanded, setIsDailyLearningExpanded] = useState(false);
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

  const handleLanguageSelect = (language: 'en' | 'es' | 'he' | 'ru' | 'de') => {
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

  const handleDailyLearningToggle = async () => {
    await updateShowDailyLearning(!showDailyLearning);
    // Keep hamburger open so user can see the process
  };

  const handleHebrewEventsExpansionToggle = () => {
    setIsHebrewEventsExpanded(!isHebrewEventsExpanded);
  };

  const handleCalendarEventTypeToggle = async (
    eventType: keyof typeof calendarPreferences,
  ) => {
    await updateCalendarPreference(eventType, !calendarPreferences[eventType]);
  };

  const handleLearningTypeToggle = async (
    learningType: keyof typeof learningPreferences,
  ) => {
    await updateLearningPreference(
      learningType,
      !learningPreferences[learningType],
    );
  };

  const handleDailyLearningExpansionToggle = () => {
    setIsDailyLearningExpanded(!isDailyLearningExpanded);
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
              {/* Language Button Grid - 3×2 with missing bottom-right */}
              <div className='grid grid-cols-3 gap-1'>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  disabled={isLanguageLoading}
                  className={`px-2 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                    i18n.language === 'en'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageSelect('es')}
                  disabled={isLanguageLoading}
                  className={`px-2 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                    i18n.language === 'es'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  ES
                </button>
                <button
                  onClick={() => handleLanguageSelect('ru')}
                  disabled={isLanguageLoading}
                  className={`px-2 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                    i18n.language === 'ru'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => handleLanguageSelect('de')}
                  disabled={isLanguageLoading}
                  className={`px-2 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                    i18n.language === 'de'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  DE
                </button>
                <button
                  onClick={() => handleLanguageSelect('he')}
                  disabled={isLanguageLoading}
                  className={`px-2 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                    i18n.language === 'he'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  HE
                </button>
                {/* Empty grid cell for balanced 3×2 layout */}
                <div></div>
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
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap overflow-hidden ${
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
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-center whitespace-nowrap overflow-hidden ${
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
            <div>
              {/* Main Hebrew Events Toggle */}
              <button
                onClick={handleHebrewEventsToggle}
                disabled={isHebrewEventsLoading}
                className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors duration-200'
              >
                <div className='flex items-center flex-1'>
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
                      <ArrowPathIcon className='w-2 h-2 animate-spin text-purple-600' />
                    )}
                  </div>
                </div>
              </button>

              {/* Collapsible Event Types Sub-menu */}
              {showHebrewEvents && (
                <>
                  <button
                    onClick={handleHebrewEventsExpansionToggle}
                    className='w-full text-left px-4 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors duration-200'
                  >
                    <span className='ms-7'>{t('Event Types')}</span>
                    <ChevronDownIcon
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isHebrewEventsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Calendar Event Type Checkboxes */}
                  {isHebrewEventsExpanded && (
                    <div className='bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600'>
                      {Object.entries(HEBREW_CALENDAR_EVENT_TYPE_KEYS).map(
                        ([key, translationKey]) => (
                          <button
                            key={key}
                            onClick={() =>
                              handleCalendarEventTypeToggle(
                                key as keyof typeof calendarPreferences,
                              )
                            }
                            disabled={isCalendarPreferencesLoading}
                            className='w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors duration-200'
                          >
                            <span className='ms-7'>{t(translationKey)}</span>
                            <div className='relative'>
                              <input
                                type='checkbox'
                                checked={
                                  calendarPreferences[
                                    key as keyof typeof calendarPreferences
                                  ] || false
                                }
                                onChange={() => {}} // Handled by button onClick
                                className='sr-only'
                              />
                              <div
                                className={`w-3 h-3 rounded border transition-all duration-200 flex items-center justify-center ${
                                  calendarPreferences[
                                    key as keyof typeof calendarPreferences
                                  ] || false
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                                }`}
                              >
                                {(calendarPreferences[
                                  key as keyof typeof calendarPreferences
                                ] ||
                                  false) && (
                                  <CheckIcon className='w-2 h-2 text-white' />
                                )}
                              </div>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Divider */}
            <div className='border-t border-gray-200 dark:border-gray-700 my-1' />

            {/* Daily Learning Schedules */}
            <div>
              {/* Main Daily Learning Toggle */}
              <button
                onClick={handleDailyLearningToggle}
                disabled={isDailyLearningLoading}
                className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors duration-200'
              >
                <div className='flex items-center flex-1'>
                  <CalendarDateRangeIcon className='w-4 h-4 me-3' />
                  {t('Daily Learning Schedules')}
                </div>
                <div className='relative'>
                  <input
                    type='checkbox'
                    checked={showDailyLearning || false}
                    onChange={() => {}} // Handled by button onClick
                    className='sr-only'
                  />
                  <div
                    className={`block w-8 h-4 rounded-full transition-all duration-200 ${
                      isDailyLearningLoading
                        ? 'bg-orange-400 animate-pulse'
                        : showDailyLearning || false
                          ? 'bg-orange-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  ></div>
                  <div
                    className={`absolute left-0 top-0 bg-white w-4 h-4 rounded-full transition-all duration-200 shadow flex items-center justify-center ${
                      showDailyLearning || false
                        ? 'translate-x-4'
                        : 'translate-x-0'
                    }`}
                  >
                    {isDailyLearningLoading && (
                      <ArrowPathIcon className='w-2 h-2 animate-spin text-orange-600' />
                    )}
                  </div>
                </div>
              </button>

              {/* Collapsible Learning Types Sub-menu */}
              {(showDailyLearning || false) && (
                <>
                  <button
                    onClick={handleDailyLearningExpansionToggle}
                    className='w-full text-left px-4 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors duration-200'
                  >
                    <span className='ms-7'>{t('Learning Types')}</span>
                    <ChevronDownIcon
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isDailyLearningExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Learning Type Checkboxes */}
                  {isDailyLearningExpanded && (
                    <div className='bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600'>
                      {Object.entries(DAILY_LEARNING_TYPE_KEYS).map(
                        ([key, translationKey]) => (
                          <button
                            key={key}
                            onClick={() =>
                              handleLearningTypeToggle(
                                key as keyof typeof learningPreferences,
                              )
                            }
                            disabled={isLearningPreferencesLoading}
                            className='w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors duration-200'
                          >
                            <span className='ms-7'>{t(translationKey)}</span>
                            <div className='relative'>
                              <input
                                type='checkbox'
                                checked={
                                  learningPreferences[
                                    key as keyof typeof learningPreferences
                                  ] || false
                                }
                                onChange={() => {}} // Handled by button onClick
                                className='sr-only'
                              />
                              <div
                                className={`w-3 h-3 rounded border transition-all duration-200 flex items-center justify-center ${
                                  learningPreferences[
                                    key as keyof typeof learningPreferences
                                  ] || false
                                    ? 'bg-orange-600 border-orange-600'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                                }`}
                              >
                                {(learningPreferences[
                                  key as keyof typeof learningPreferences
                                ] ||
                                  false) && (
                                  <CheckIcon className='w-2 h-2 text-white' />
                                )}
                              </div>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

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
