'use client';

import { useCalendarMode } from '@/contexts/CalendarModeContext';
import HebrewDatePicker from './HebrewDatePicker';
import GregorianDatePicker from './GregorianDatePicker';

interface UnifiedDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export default function UnifiedDatePicker({
  selectedDate,
  onDateChange,
  className = '',
}: UnifiedDatePickerProps) {
  const { calendarMode } = useCalendarMode();

  if (calendarMode === 'hebrew') {
    return (
      <HebrewDatePicker
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        className={className}
      />
    );
  }

  return (
    <GregorianDatePicker
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      className={className}
    />
  );
}
