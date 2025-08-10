'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from 'next-auth/react';

interface HamburgerMenuProps {
  onLanguageToggle?: () => void;
  isLanguageLoading?: boolean;
  onOpenProfile?: () => void;
  className?: string;
}

export default function HamburgerMenu({
  onLanguageToggle,
  isLanguageLoading = false,
  onOpenProfile,
  className = '',
}: HamburgerMenuProps) {
  const { t, i18n } = useTranslation();
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

  const handleLanguageToggle = () => {
    if (onLanguageToggle) {
      onLanguageToggle();
    }
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
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
            {/* Language Toggle - First option */}
            <button
              onClick={handleLanguageToggle}
              disabled={isLanguageLoading}
              className='w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200'
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
              {isLanguageLoading
                ? t('Loading...')
                : i18n.language === 'en'
                  ? 'עברית'
                  : 'English'}
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
