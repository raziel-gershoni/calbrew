'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import HamburgerMenu from './HamburgerMenu';
import UserProfileModal from './UserProfileModal';

interface CalendarHeaderProps {
  className?: string;
  isLandscapePhone?: boolean;
  isSmallScreen?: boolean;
  calendarHeight?: number;
}

export default function CalendarHeader({
  className = '',
  isLandscapePhone = false,
  isSmallScreen = false,
  calendarHeight = 500,
}: CalendarHeaderProps) {
  const { data: session } = useSession();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  // Determine compact styling based on device characteristics
  const isVerySmallDevice = calendarHeight <= 300;
  const isCompactPhone = isSmallScreen && calendarHeight <= 400;
  const isLandscapeMode = isLandscapePhone;

  // Dynamic class for responsive padding and margins
  const headerClasses = [
    'flex items-center',
    isVerySmallDevice
      ? 'mb-1 p-1'
      : isCompactPhone || isLandscapeMode
        ? 'mb-2 p-1'
        : 'mb-4 p-2',
    className,
  ].join(' ');

  // Dynamic title sizing - keep full size on landscape phones
  const shouldCompactTitle =
    isVerySmallDevice || (isCompactPhone && !isLandscapePhone);
  const titleSizeClass = isVerySmallDevice
    ? 'text-lg'
    : shouldCompactTitle
      ? 'text-xl'
      : 'text-2xl';

  // Smart logic for showing user image based on horizontal space
  const shouldShowUserImage =
    // Always show on desktop/large screens (md and above - 768px+)
    !isSmallScreen ||
    // Show on landscape phones (more horizontal space available)
    isLandscapePhone ||
    // Show on tablets like iPad mini even in portrait (they have enough width)
    // This covers devices roughly between 640px - 768px width
    (isSmallScreen && !isVerySmallDevice && !isCompactPhone);

  return (
    <>
      <div className={headerClasses}>
        {/* Main Header Layout - Simple flexbox that works naturally with RTL */}
        <div className='flex justify-between items-center w-full'>
          {/* Clickable User Info */}
          <button
            onClick={openProfileModal}
            className='flex items-center mx-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-left'
            aria-label={`Open profile for ${session?.user?.name}`}
          >
            {session?.user?.image && shouldShowUserImage && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className='w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 me-2'
              />
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
            <h1 className={`${titleSizeClass} font-bold`}>Calbrew</h1>
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
