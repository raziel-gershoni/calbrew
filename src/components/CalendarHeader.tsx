'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import HamburgerMenu from './HamburgerMenu';
import UserProfileModal from './UserProfileModal';

interface CalendarHeaderProps {
  className?: string;
}

export default function CalendarHeader({
  className = '',
}: CalendarHeaderProps) {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  // Use CSS classes for all responsiveness - no JavaScript device detection needed
  const headerClasses = [
    'flex items-center p-2 sm:p-3', // Responsive padding via CSS
    className,
  ].join(' ');

  return (
    <>
      <div className={headerClasses} dir={getTextDirection(i18n.language)}>
        {/* Main Header Layout - Simple flexbox that works naturally with RTL */}
        <div className='flex justify-between items-center w-full'>
          {/* Clickable User Info */}
          <button
            onClick={openProfileModal}
            className='flex items-center mx-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-left'
            aria-label={`Open profile for ${session?.user?.name}`}
          >
            {session?.user && (
              <>
                {session.user.image && !imageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || t('User')}
                    className='w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 me-2 hidden sm:block'
                    loading='lazy'
                    referrerPolicy='no-referrer'
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className='w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 border border-gray-300 dark:border-gray-600 me-2 hidden sm:block relative text-white text-xs font-bold'>
                    <span className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
                      {session.user.name?.[0]?.toUpperCase() || t('User')[0]}
                    </span>
                  </div>
                )}
              </>
            )}
            <div>
              <div className='text-sm font-medium text-gray-900 dark:text-white'>
                {session?.user?.name}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400'>
                {session?.user?.email}
              </div>
            </div>
          </button>

          {/* App Title - Centered */}
          <div className='flex-1 flex justify-center'>
            <h1 className='text-lg sm:text-xl md:text-2xl font-bold'>
              Calbrew
            </h1>
          </div>

          {/* Hamburger Menu - Always on the end (right in LTR, left in RTL) */}
          <HamburgerMenu
            onOpenProfile={openProfileModal}
            className='flex-shrink-0'
          />
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </>
  );
}
