'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { HDate, gematriya, Locale } from '@hebcal/core';
import { useTranslation } from 'react-i18next';
import { getTextDirection } from '@/i18n';
import {
  WheelPicker,
  WheelPickerWrapper,
  WheelPickerOption,
} from './wheel-picker';

interface HebrewDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export default function HebrewDatePicker({
  selectedDate,
  onDateChange,
  className = '',
}: HebrewDatePickerProps) {
  const { t, i18n } = useTranslation();

  // Convert selected date to Hebrew date components
  const selectedHebrew = useMemo(() => {
    const hdate = new HDate(selectedDate);
    return {
      day: hdate.getDate(),
      month: hdate.getMonth(),
      year: hdate.getFullYear(),
      monthName: hdate.getMonthName(),
    };
  }, [selectedDate]);

  // Local state for picker values
  const [pickedYear, setPickedYear] = useState(selectedHebrew.year);
  const [pickedMonth, setPickedMonth] = useState(selectedHebrew.month);
  const [pickedDay, setPickedDay] = useState(selectedHebrew.day);
  
  // Dynamic year range state
  const [yearRange, setYearRange] = useState(() => ({
    min: selectedHebrew.year - 100,
    max: selectedHebrew.year + 100,
  }));

  // Update local state when selectedDate changes
  useEffect(() => {
    setPickedYear(selectedHebrew.year);
    setPickedMonth(selectedHebrew.month);
    setPickedDay(selectedHebrew.day);
  }, [selectedHebrew]);

  // Expand year range when approaching limits
  const expandYearRange = useCallback((selectedYear: number) => {
    setYearRange(prev => {
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
        label: i18n.language === 'he' ? gematriya(year) : year.toString(),
      });
    }

    return years;
  }, [yearRange, i18n.language]);

  // Generate month options for the selected year
  const monthOptions = useMemo((): WheelPickerOption[] => {
    const numMonths = HDate.monthsInYear(pickedYear);
    const months: WheelPickerOption[] = [];

    for (let monthNum = 1; monthNum <= numMonths; monthNum++) {
      const hdate = new HDate(1, monthNum, pickedYear);
      const monthNameEn = hdate.getMonthName();
      const monthNameHe = Locale.gettext(monthNameEn, 'he');

      months.push({
        value: monthNum.toString(),
        label: i18n.language === 'he' ? monthNameHe : monthNameEn,
      });
    }

    return months;
  }, [pickedYear, i18n.language]);

  // Generate day options for the selected month/year
  const dayOptions = useMemo((): WheelPickerOption[] => {
    const daysInMonth = new HDate(1, pickedMonth, pickedYear).daysInMonth();
    const days: WheelPickerOption[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        value: day.toString(),
        label: i18n.language === 'he' ? gematriya(day) : day.toString(),
      });
    }

    return days;
  }, [pickedMonth, pickedYear, i18n.language]);

  // Update picked day if it exceeds the days in the new month
  useEffect(() => {
    const maxDays = dayOptions.length;
    if (pickedDay > maxDays) {
      setPickedDay(maxDays);
    }
  }, [pickedDay, dayOptions.length]);

  // Handle year change
  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    setPickedYear(newYear);
    
    // Expand year range if needed
    expandYearRange(newYear);

    // Create new Hebrew date and notify parent
    try {
      const newHDate = new HDate(pickedDay, pickedMonth, newYear);
      onDateChange(newHDate.greg());
    } catch {
      // If date is invalid (e.g., Adar II in non-leap year), use first day of month
      const fallbackHDate = new HDate(1, pickedMonth, newYear);
      setPickedDay(1);
      onDateChange(fallbackHDate.greg());
    }
  };

  // Handle month change
  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    setPickedMonth(newMonth);

    // Create new Hebrew date and notify parent
    try {
      const newHDate = new HDate(pickedDay, newMonth, pickedYear);
      onDateChange(newHDate.greg());
    } catch {
      // If date is invalid, use first day of new month
      const fallbackHDate = new HDate(1, newMonth, pickedYear);
      setPickedDay(1);
      onDateChange(fallbackHDate.greg());
    }
  };

  // Handle day change
  const handleDayChange = (value: string) => {
    const newDay = parseInt(value);
    setPickedDay(newDay);

    // Create new Hebrew date and notify parent
    const newHDate = new HDate(newDay, pickedMonth, pickedYear);
    onDateChange(newHDate.greg());
  };

  // Get current values for wheel pickers (ensure they exist in options)
  const currentYearValue =
    yearOptions.find((y) => y.value === pickedYear.toString())?.value ||
    yearOptions[0]?.value ||
    '';
  const currentMonthValue =
    monthOptions.find((m) => m.value === pickedMonth.toString())?.value ||
    monthOptions[0]?.value ||
    '';
  const currentDayValue =
    dayOptions.find((d) => d.value === pickedDay.toString())?.value ||
    dayOptions[0]?.value ||
    '';

  // Don't render if data isn't ready
  if (
    yearOptions.length === 0 ||
    monthOptions.length === 0 ||
    dayOptions.length === 0
  ) {
    return <div className='text-center p-4'>Loading...</div>;
  }

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Hebrew Date Picker Debug:', {
      pickedYear,
      pickedMonth,
      pickedDay,
      currentYearValue,
      currentMonthValue,
      currentDayValue,
      yearOptionsCount: yearOptions.length,
      monthOptionsCount: monthOptions.length,
      dayOptionsCount: dayOptions.length,
      // Check for duplicate values
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
