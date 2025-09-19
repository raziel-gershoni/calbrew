'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import {
  WheelPicker,
  WheelPickerWrapper,
  WheelPickerOption,
} from './wheel-picker';

interface GregorianDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export default function GregorianDatePicker({
  selectedDate,
  onDateChange,
  className = '',
}: GregorianDatePickerProps) {
  const { t, i18n } = useTranslation();

  // Convert selected date to Gregorian components
  const selectedGregorian = useMemo(() => {
    return {
      day: selectedDate.getDate(),
      month: selectedDate.getMonth() + 1, // JavaScript months are 0-indexed
      year: selectedDate.getFullYear(),
    };
  }, [selectedDate]);

  // Local state for picker values
  const [pickedYear, setPickedYear] = useState(selectedGregorian.year);
  const [pickedMonth, setPickedMonth] = useState(selectedGregorian.month);
  const [pickedDay, setPickedDay] = useState(selectedGregorian.day);

  // Dynamic year range state
  const [yearRange, setYearRange] = useState(() => ({
    min: selectedGregorian.year - 100,
    max: selectedGregorian.year + 100,
  }));

  // Update local state when selectedDate changes
  useEffect(() => {
    setPickedYear(selectedGregorian.year);
    setPickedMonth(selectedGregorian.month);
    setPickedDay(selectedGregorian.day);
  }, [selectedGregorian]);

  // Expand year range when approaching limits
  const expandYearRange = useCallback((selectedYear: number) => {
    setYearRange((prev) => {
      const buffer = 50; // Years to keep on each side
      const expandBy = 100; // Years to add when expanding

      let newMin = prev.min;
      let newMax = prev.max;

      // Expand backward if we're close to the minimum
      if (selectedYear - prev.min < buffer) {
        newMin = prev.min - expandBy;
      }

      // Expand forward if we're close to the maximum
      if (prev.max - selectedYear < buffer) {
        newMax = prev.max + expandBy;
      }

      // Only update if range actually changed
      if (newMin !== prev.min || newMax !== prev.max) {
        return { min: newMin, max: newMax };
      }

      return prev;
    });
  }, []);

  // Generate dynamic year range
  const yearOptions = useMemo((): WheelPickerOption[] => {
    const years: WheelPickerOption[] = [];

    for (let year = yearRange.min; year <= yearRange.max; year++) {
      years.push({
        value: year.toString(),
        label: year.toString(),
      });
    }
    return years;
  }, [yearRange]);

  // Generate month options based on language
  const monthOptions = useMemo((): WheelPickerOption[] => {
    const months: WheelPickerOption[] = [];

    for (let month = 1; month <= 12; month++) {
      // Create a date to get the month name
      const date = new Date(pickedYear, month - 1, 1);
      const monthName = date.toLocaleDateString(
        i18n.language === 'he'
          ? 'he-IL'
          : i18n.language === 'es'
            ? 'es-ES'
            : 'en-US',
        { month: 'long' },
      );

      months.push({
        value: month.toString(),
        label: monthName,
      });
    }
    return months;
  }, [pickedYear, i18n.language]);

  // Generate day options based on selected month/year
  const dayOptions = useMemo((): WheelPickerOption[] => {
    const daysInMonth = new Date(pickedYear, pickedMonth, 0).getDate();
    const days: WheelPickerOption[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        value: day.toString(),
        label: day.toString(),
      });
    }
    return days;
  }, [pickedYear, pickedMonth]);

  // Handle value changes and emit date change
  const handleDateChange = (
    newYear: number,
    newMonth: number,
    newDay: number,
  ) => {
    // Validate the date exists (handles edge cases like Feb 30)
    const maxDay = new Date(newYear, newMonth, 0).getDate();
    const validDay = Math.min(newDay, maxDay);

    const newDate = new Date(newYear, newMonth - 1, validDay); // Convert back to 0-indexed month
    onDateChange(newDate);
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    setPickedYear(newYear);

    // Expand year range if needed
    expandYearRange(newYear);

    handleDateChange(newYear, pickedMonth, pickedDay);
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    setPickedMonth(newMonth);
    handleDateChange(pickedYear, newMonth, pickedDay);
  };

  const handleDayChange = (value: string) => {
    const newDay = parseInt(value);
    setPickedDay(newDay);
    handleDateChange(pickedYear, pickedMonth, newDay);
  };

  // Get current values for the pickers
  const currentYearValue = pickedYear.toString();
  const currentMonthValue = pickedMonth.toString();
  const currentDayValue = pickedDay.toString();

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('GregorianDatePicker Debug:', {
      selectedDate,
      pickedYear,
      pickedMonth,
      pickedDay,
      yearOptions: yearOptions.slice(0, 3),
      monthOptions: monthOptions.slice(0, 3),
      dayOptions: dayOptions.slice(0, 3),
    });
  }

  return (
    <div
      className={`flex gap-1 ${className}`}
      dir={getTextDirection(i18n.language)}
    >
      {/* Day Picker */}
      <div className='flex-1'>
        <div className='text-center'>
          <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide'>
            {t('Day')}
          </h4>
          <WheelPickerWrapper className='h-30 overflow-hidden w-full'>
            <WheelPicker
              key='day-picker'
              options={dayOptions}
              value={currentDayValue}
              onValueChange={handleDayChange}
              visibleCount={12}
              infinite
              classNames={{
                optionItem:
                  'text-center py-1 text-gray-600 dark:text-gray-300 h-8 flex items-center justify-center text-sm font-medium',
                highlightWrapper:
                  'bg-blue-100 dark:bg-blue-800 border-y border-blue-200 dark:border-blue-700 h-8 text-blue-900 dark:text-blue-100',
              }}
            />
          </WheelPickerWrapper>
        </div>
      </div>

      {/* Month Picker */}
      <div className='flex-2'>
        <div className='text-center'>
          <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide'>
            {t('Month')}
          </h4>
          <WheelPickerWrapper className='h-30 overflow-hidden w-full'>
            <WheelPicker
              key='month-picker'
              options={monthOptions}
              value={currentMonthValue}
              onValueChange={handleMonthChange}
              visibleCount={12}
              infinite
              classNames={{
                optionItem:
                  'text-center py-1 text-gray-600 dark:text-gray-300 h-8 flex items-center justify-center text-sm font-medium',
                highlightWrapper:
                  'bg-blue-100 dark:bg-blue-800 border-y border-blue-200 dark:border-blue-700 h-8 text-blue-900 dark:text-blue-100',
              }}
            />
          </WheelPickerWrapper>
        </div>
      </div>

      {/* Year Picker */}
      <div className='flex-1'>
        <div className='text-center'>
          <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide'>
            {t('Year')}
          </h4>
          <WheelPickerWrapper className='h-30 overflow-hidden w-full'>
            <WheelPicker
              key='year-picker'
              options={yearOptions}
              value={currentYearValue}
              onValueChange={handleYearChange}
              visibleCount={12}
              classNames={{
                optionItem:
                  'text-center py-1 text-gray-600 dark:text-gray-300 h-8 flex items-center justify-center text-sm font-medium',
                highlightWrapper:
                  'bg-blue-100 dark:bg-blue-800 border-y border-blue-200 dark:border-blue-700 h-8 text-blue-900 dark:text-blue-100',
              }}
            />
          </WheelPickerWrapper>
        </div>
      </div>
    </div>
  );
}
