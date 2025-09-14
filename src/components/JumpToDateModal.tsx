'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import { useCalendarMode } from '@/contexts/CalendarModeContext';
import UnifiedDatePicker from './UnifiedDatePicker';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface JumpToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelected: (date: Date) => void;
  initialDate?: Date;
}

export default function JumpToDateModal({
  isOpen,
  onClose,
  onDateSelected,
  initialDate = new Date(),
}: JumpToDateModalProps) {
  const { t, i18n } = useTranslation();
  const { calendarMode: _calendarMode } = useCalendarMode();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Update internal selectedDate when initialDate prop changes
  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onDateSelected(selectedDate);
    onClose();
  };

  const handleCancel = () => {
    setSelectedDate(initialDate);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50'>
      <div
        className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 flex flex-col'
        dir={getTextDirection(i18n.language)}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {t('Jump to Date')}
          </h2>
          <button
            onClick={handleCancel}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            aria-label={t('Close')}
          >
            <XMarkIcon className='w-5 h-5' />
          </button>
        </div>

        {/* Date Picker Content */}
        <div className='flex-1 overflow-hidden flex flex-col p-4'>
          {/* Unified Date Picker */}
          <div className='flex-1 min-h-0'>
            <UnifiedDatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              className='justify-center h-full'
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 justify-end flex-shrink-0 mt-4'>
            <button
              onClick={handleCancel}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors'
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
            >
              {t('Go to Date')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
