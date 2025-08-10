'use client';

import { useTranslation } from 'react-i18next';
import { useSession, signOut } from 'next-auth/react';

interface CalendarHeaderProps {
  className?: string;
  onLanguageToggle?: () => void;
  isLanguageLoading?: boolean;
  isLandscapePhone?: boolean;
  isSmallScreen?: boolean;
  calendarHeight?: number;
}

export default function CalendarHeader({
  className = '',
  onLanguageToggle,
  isLanguageLoading = false,
  isLandscapePhone = false,
  isSmallScreen = false,
  calendarHeight = 500,
}: CalendarHeaderProps) {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();

  const handleLanguageToggle = () => {
    if (onLanguageToggle) {
      onLanguageToggle();
    }
  };

  // Determine compact styling based on device characteristics
  const isVerySmallDevice = calendarHeight <= 300;
  // Compact padding/margins for all landscape phones and small portrait phones
  const isCompactPhone = isSmallScreen && calendarHeight <= 400;
  const isLandscapeMode = isLandscapePhone;

  // Dynamic class for responsive padding and margins
  const headerClasses = [
    'flex flex-col md:flex-row justify-between items-center',
    isVerySmallDevice
      ? 'mb-1 p-1'
      : isCompactPhone || isLandscapeMode
        ? 'mb-2 p-1'
        : 'mb-4 p-2',
    className,
  ].join(' ');

  // Dynamic button sizing - compact for very small devices and small portrait phones
  const buttonSizeClass = isVerySmallDevice
    ? 'py-1 px-2 text-xs'
    : isCompactPhone
      ? 'py-1.5 px-3 text-sm'
      : 'py-2 px-4';

  // Dynamic title sizing - separate logic for title to keep full size on landscape phones
  // Only make title smaller for very small devices or small portrait phones
  const shouldCompactTitle =
    isVerySmallDevice || (isCompactPhone && !isLandscapePhone);
  const titleSizeClass = isVerySmallDevice
    ? 'text-lg'
    : shouldCompactTitle
      ? 'text-xl'
      : 'text-2xl';

  return (
    <div className={headerClasses}>
      {/* User Info Section */}
      <div className='flex justify-between w-full md:w-auto'>
        <div className='flex-1 md:w-auto flex justify-start'>
          <span className='mx-4'>
            {session?.user?.name}
            <div className='text-xs'>{session?.user?.email}</div>
          </span>
        </div>

        {/* Mobile Controls */}
        <div className='md:hidden flex items-center'>
          <button
            onClick={handleLanguageToggle}
            disabled={isLanguageLoading}
            className={`bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-lg shadow-lg mx-2 transition-colors duration-200 ${buttonSizeClass}`}
          >
            {isLanguageLoading
              ? '...'
              : i18n.language === 'en'
                ? 'עברית'
                : 'English'}
          </button>
          <button
            onClick={() => signOut()}
            className={`bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg ${buttonSizeClass}`}
          >
            {t('Sign Out')}
          </button>
        </div>
      </div>

      {/* App Title */}
      <div
        className={`w-full md:w-auto flex justify-center ${
          isVerySmallDevice
            ? 'mt-1 md:mt-0'
            : isCompactPhone
              ? 'mt-2 md:mt-0'
              : 'mt-4 md:mt-0'
        }`}
      >
        <h1 className={`${titleSizeClass} font-bold md:hidden`}>Calbrew</h1>
      </div>

      <div className='hidden md:flex items-center flex-1 justify-center'>
        <h1 className={`${titleSizeClass} font-bold mx-4`}>Calbrew</h1>
      </div>

      {/* Desktop Controls */}
      <div className='hidden md:flex items-center'>
        <button
          onClick={() => signOut()}
          className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg mx-2'
        >
          {t('Sign Out')}
        </button>
        <button
          onClick={handleLanguageToggle}
          disabled={isLanguageLoading}
          className='bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors duration-200'
        >
          {isLanguageLoading
            ? '...'
            : i18n.language === 'en'
              ? 'עברית'
              : 'English'}
        </button>
      </div>
    </div>
  );
}
