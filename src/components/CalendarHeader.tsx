'use client';

import { useTranslation } from 'react-i18next';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/hooks/useLanguage';

interface CalendarHeaderProps {
  className?: string;
}

export default function CalendarHeader({
  className = '',
}: CalendarHeaderProps) {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { currentLanguage, changeLanguage, isLoading } = useLanguage();

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'he' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <div
      className={`flex flex-col md:flex-row justify-between items-center mb-4 p-2 ${className}`}
    >
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
            disabled={isLoading}
            className='bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg shadow-lg mx-2 transition-colors duration-200'
          >
            {isLoading ? '...' : currentLanguage === 'en' ? 'עברית' : 'English'}
          </button>
          <button
            onClick={() => signOut()}
            className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg'
          >
            {t('Sign Out')}
          </button>
        </div>
      </div>

      {/* App Title */}
      <div className='w-full md:w-auto mt-4 md:mt-0 flex justify-center'>
        <h1 className='text-2xl font-bold md:hidden'>Calbrew</h1>
      </div>

      <div className='hidden md:flex items-center flex-1 justify-center'>
        <h1 className='text-2xl font-bold mx-4'>Calbrew</h1>
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
          disabled={isLoading}
          className='bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors duration-200'
        >
          {isLoading ? '...' : currentLanguage === 'en' ? 'עברית' : 'English'}
        </button>
      </div>
    </div>
  );
}
