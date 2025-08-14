'use client';

import { useState, useEffect, useMemo } from 'react';
import { HDate, gematriya, Locale } from '@hebcal/core';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useCalendarMode } from '@/contexts/CalendarModeContext';
import EventForm from './EventForm';
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import LoadingSpinner from './LoadingSpinner';
import CalendarHeader from './CalendarHeader';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import {
  generateEventOccurrences,
  EventOccurrence,
} from '@/utils/hebrewDateUtils';

// Types
interface HebrewDay {
  hebrewDay: number;
  hebrewMonth: string;
  hebrewYear: number;
  gregorianDate: Date;
  weekday: number;
  hebrewDateString: string;
  isCurrentMonth?: boolean; // Added for overlapping days styling
}

interface GregorianDay {
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  date: Date;
  weekday: number;
  isCurrentMonth: boolean;
}

// Type guards
const isHebrewDay = (day: HebrewDay | GregorianDay): day is HebrewDay => {
  return 'hebrewDay' in day && 'gregorianDate' in day;
};

const isGregorianDay = (day: HebrewDay | GregorianDay): day is GregorianDay => {
  return 'gregorianDay' in day && 'date' in day;
};


// Gregorian month names in Hebrew
const GREGORIAN_MONTHS_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

// Gregorian month names in English
const GREGORIAN_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Layout types for responsive design
enum LayoutType {
  DESKTOP = 'desktop',           // ≥1200px: side-by-side with full events panel
  LARGE_TABLET = 'large_tablet', // 768-1199px: side-by-side with adapted panel
  LANDSCAPE_PHONE = 'landscape_phone', // landscape phones: horizontal split  
  PORTRAIT_PHONE = 'portrait_phone',   // portrait phones: vertical stack
  TINY_MOBILE = 'tiny_mobile'    // very small: modal-based
}

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const { calendarMode } = useCalendarMode();

  // Use the actual calendar mode from the hook
  const actualCalendarMode = calendarMode;

  const {
    events: masterEvents,
    isLoading,
    isCreating,
    isSaving,
    isDeleting,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  // Get localized weekday names
  const weekdays = useMemo(() => {
    const baseDate = new Date(2024, 0, 7); // Sunday, Jan 7, 2024
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      if (i18n.language === 'he') {
        return date
          .toLocaleDateString('he-IL', { weekday: 'short' })
          .replace('יום ', '');
      } else {
        return date.toLocaleDateString(i18n.language, { weekday: 'short' });
      }
    });
  }, [i18n.language]);

  // Calendar state
  const [hebrewYear, setHebrewYear] = useState(5785);
  const [hebrewMonth, setHebrewMonth] = useState('Tishrei');
  const [gregorianYear, setGregorianYear] = useState(2024);
  const [gregorianMonth, setGregorianMonth] = useState(8); // September (0-indexed)

  // Event display state
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileEventModalOpen, setIsMobileEventModalOpen] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>(LayoutType.DESKTOP);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(500);

  // Initialize calendar to current Hebrew month
  useEffect(() => {
    const now = new Date();
    const hebrewDate = new HDate(now);
    setHebrewYear(hebrewDate.getFullYear());
    setHebrewMonth(hebrewDate.getMonthName());
    setGregorianYear(now.getFullYear());
    setGregorianMonth(now.getMonth());
  }, []);

  // Robust device detection based on previous working logic
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Smart layout detection using multiple factors
      // Use modal layout when:
      // 1. Very small screens (phones) - width < 640px
      // 2. Limited height regardless of width - height < 600px (landscape phones/tablets)
      // 3. Small total area (small devices) - area < 400,000 pixels
      const isVerySmallWidth = width < 640;
      const isLimitedHeight = height < 600;
      const isSmallArea = width * height < 400000; // ~632x632 equivalent

      let newIsSmallScreen =
        isVerySmallWidth || isLimitedHeight || isSmallArea;

      // Detect landscape phone layout (phones in landscape orientation)
      const newIsLandscapePhone =
        width > height && width < 1024 && width >= 640;

      // Dynamic calendar height based on screen size and available space
      let newCalendarHeight = 500; // Default height for tablets/desktop

      if (newIsLandscapePhone) {
        // Landscape phones - be more aggressive with height usage
        // Account for: app header (~40px compact), calendar toolbar (~30px compact), margins (~20px)
        // Leave minimal space for events list, maximize calendar
        const reservedSpace = isVerySmallWidth && height <= 375 ? 70 : 90; // iPhone SE vs larger phones
        newCalendarHeight = Math.max(280, height - reservedSpace);
      } else if (width <= 375 && height <= 667) {
        // iPhone SE and similar very small devices (375x667)
        newCalendarHeight = 300;
      } else if (width <= 390 && height >= 800 && height < 900) {
        // iPhone 14, iPhone 13 mini, etc. (390x844, etc.)
        newCalendarHeight = 480;
      } else if (width <= 428 && height >= 900) {
        // iPhone 14 Pro Max, iPhone 15 Pro Max, etc. (430x932, 428x926) - utilize the huge screen
        newCalendarHeight = 550;
      } else if (width <= 414 && height >= 850) {
        // iPhone 13 Pro Max, iPhone 12 Pro Max, etc. (414x896)
        newCalendarHeight = 520;
      } else if (width < 640) {
        // Other phones (iPhone 12, iPhone 13, etc.)
        newCalendarHeight = 450;
      }

      const isLandscape = width > height;
      
      let newLayoutType: LayoutType;
      if (newIsLandscapePhone) {
        // Landscape phones with sufficient width - HIGHEST PRIORITY
        newLayoutType = LayoutType.LANDSCAPE_PHONE;
      } else if (width >= 1200) {
        // Desktop - always side-by-side
        newLayoutType = LayoutType.DESKTOP;
      } else if (width >= 1024) {
        // Large tablets - use side-by-side in landscape, stacked in portrait
        newLayoutType = isLandscape ? LayoutType.LARGE_TABLET : LayoutType.PORTRAIT_PHONE;
      } else if (width >= 768) {
        // Medium tablets - use side-by-side in landscape, stacked in portrait
        newLayoutType = isLandscape ? LayoutType.LARGE_TABLET : LayoutType.PORTRAIT_PHONE;
      } else if (width < 375 || (width < 640 && height < 500)) {
        // Very small devices use modal layout - only very tiny screens
        newLayoutType = LayoutType.TINY_MOBILE;
        newIsSmallScreen = true;
      } else {
        // Regular phones in portrait - use stacked layout with events at bottom
        newLayoutType = LayoutType.PORTRAIT_PHONE;
        newIsSmallScreen = false; // Portrait phones should NOT be considered small screen
      }

      const screenChanged = newIsSmallScreen !== isSmallScreen;
      const landscapeChanged = newIsLandscapePhone !== isLandscapePhone;
      const heightChanged = newCalendarHeight !== calendarHeight;
      const layoutChanged = newLayoutType !== layoutType;

      if (screenChanged || landscapeChanged || heightChanged || layoutChanged) {
        setIsSmallScreen(newIsSmallScreen);
        setIsLandscapePhone(newIsLandscapePhone);
        setCalendarHeight(newCalendarHeight);
        setLayoutType(newLayoutType);

        // Debug log for development
        if (process.env.NODE_ENV === 'development' && (screenChanged || layoutChanged)) {
          console.log('Layout decision:', {
            width,
            height,
            area: width * height,
            isVerySmallWidth,
            isLimitedHeight,
            isSmallArea,
            isLandscapePhone: newIsLandscapePhone,
            layoutType: newLayoutType,
            calendarHeight: newCalendarHeight,
          });
        }
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [isSmallScreen, isLandscapePhone, calendarHeight, layoutType]);

  // Get calendar view date range for event filtering (includes overlapping days)
  const calendarViewRange = useMemo(() => {
    if (actualCalendarMode === 'hebrew') {
      // Get first and last day of Hebrew month - FIXED: correct constructor order (day, month, year)
      const firstDay = new HDate(1, hebrewMonth, hebrewYear);
      let lastDay: Date;
      try {
        const testDate = new HDate(30, hebrewMonth, hebrewYear);
        if (testDate.getMonth() === firstDay.getMonth()) {
          lastDay = testDate.greg();
        } else {
          lastDay = new HDate(29, hebrewMonth, hebrewYear).greg();
        }
      } catch {
        lastDay = new HDate(29, hebrewMonth, hebrewYear).greg();
      }

      // Extend range to include overlapping days from previous/next months
      const firstDayGregorian = firstDay.greg();
      const firstWeekday = firstDayGregorian.getDay();

      // Start from the beginning of the calendar grid (including previous month overlapping days)
      const gridStart = new Date(firstDayGregorian);
      gridStart.setDate(gridStart.getDate() - firstWeekday);

      // End at the end of the calendar grid (including next month overlapping days)
      const gridEnd = new Date(lastDay);
      const totalDaysInCurrentMonth =
        Math.ceil(
          (lastDay.getTime() - firstDayGregorian.getTime()) /
            (24 * 60 * 60 * 1000),
        ) + 1;
      const totalCells =
        Math.ceil((firstWeekday + totalDaysInCurrentMonth) / 7) * 7;
      const remainingCells =
        totalCells - firstWeekday - totalDaysInCurrentMonth;
      gridEnd.setDate(gridEnd.getDate() + remainingCells);

      return { start: gridStart, end: gridEnd };
    } else {
      // For Gregorian calendar, also include overlapping days
      const firstDay = new Date(gregorianYear, gregorianMonth, 1);
      const lastDay = new Date(gregorianYear, gregorianMonth + 1, 0);
      const firstWeekday = firstDay.getDay();

      // Start from the beginning of the calendar grid
      const gridStart = new Date(
        gregorianYear,
        gregorianMonth,
        1 - firstWeekday,
      );

      // End at the end of the calendar grid
      const daysInMonth = lastDay.getDate();
      const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
      const remainingCells = totalCells - firstWeekday - daysInMonth;
      const gridEnd = new Date(
        gregorianYear,
        gregorianMonth + 1,
        remainingCells,
      );

      return { start: gridStart, end: gridEnd };
    }
  }, [
    actualCalendarMode,
    hebrewYear,
    hebrewMonth,
    gregorianYear,
    gregorianMonth,
  ]);

  // Generate event occurrences for entire calendar view (including overlapping days)
  useEffect(() => {
    const newOccurrences = generateEventOccurrences(
      masterEvents,
      calendarViewRange.start,
      calendarViewRange.end,
    );
    setOccurrences(newOccurrences);
  }, [masterEvents, calendarViewRange]);

  // Generate Hebrew month view with overlapping days
  const hebrewCalendarGrid = useMemo(() => {
    if (actualCalendarMode !== 'hebrew') {
      return null;
    }

    const days: (HebrewDay | null)[][] = [];

    // Get month length (29 or 30 days) - FIXED: correct constructor order (day, month, year)
    let dayCount = 29;
    try {
      const testDate = new HDate(30, hebrewMonth, hebrewYear);
      const firstOfMonth = new HDate(1, hebrewMonth, hebrewYear);
      if (testDate.getMonth() === firstOfMonth.getMonth()) {
        dayCount = 30;
      }
    } catch {
      // Month has 29 days
    }

    // Generate current month days
    const monthDays: HebrewDay[] = [];
    for (let day = 1; day <= dayCount; day++) {
      const hebrewDate = new HDate(day, hebrewMonth, hebrewYear);
      const gregorianDate = hebrewDate.greg();

      monthDays.push({
        hebrewDay: day,
        hebrewMonth: hebrewMonth,
        hebrewYear: hebrewYear,
        gregorianDate: gregorianDate,
        weekday: gregorianDate.getDay(),
        hebrewDateString: hebrewDate.toString(),
      });
    }

    // Get first day of current month for alignment
    const firstWeekday = monthDays[0].weekday;

    // Create overlapping days for previous month
    const overlappingDays: (HebrewDay | null)[] = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const gregorianDate = new Date(monthDays[0].gregorianDate);
      gregorianDate.setDate(gregorianDate.getDate() - (i + 1));
      // Convert Gregorian date back to Hebrew date for overlapping days
      const overlappingHebrewDate = new HDate(gregorianDate);
      overlappingDays.push({
        hebrewDay: overlappingHebrewDate.getDate(),
        hebrewMonth: overlappingHebrewDate.getMonthName(),
        hebrewYear: overlappingHebrewDate.getFullYear(),
        gregorianDate: gregorianDate,
        weekday: gregorianDate.getDay(),
        hebrewDateString: overlappingHebrewDate.toString(),
      });
    }

    // Combine overlapping days with current month days
    const allDays = [...overlappingDays, ...monthDays];

    // Add next month overlapping days to complete the grid
    const totalCells = Math.ceil(allDays.length / 7) * 7;
    const lastDay = monthDays[monthDays.length - 1];
    let nextDayOffset = 1;

    while (allDays.length < totalCells) {
      const gregorianDate = new Date(lastDay.gregorianDate);
      gregorianDate.setDate(gregorianDate.getDate() + nextDayOffset);
      // Convert Gregorian date back to Hebrew date for overlapping days
      const overlappingHebrewDate = new HDate(gregorianDate);
      allDays.push({
        hebrewDay: overlappingHebrewDate.getDate(),
        hebrewMonth: overlappingHebrewDate.getMonthName(),
        hebrewYear: overlappingHebrewDate.getFullYear(),
        gregorianDate: gregorianDate,
        weekday: gregorianDate.getDay(),
        hebrewDateString: overlappingHebrewDate.toString(),
      });
      nextDayOffset++;
    }

    // Create grid - mark overlapping days by checking if they belong to current month
    for (let i = 0; i < allDays.length; i += 7) {
      const week = allDays.slice(i, i + 7).map((day) => {
        if (!day) {
          return null;
        }
        // Mark as current month only if it matches our target month and year
        const isCurrentMonth =
          day.hebrewMonth === hebrewMonth && day.hebrewYear === hebrewYear;
        return { ...day, isCurrentMonth };
      });
      days.push(week as (HebrewDay | null)[]);
    }

    return { weeks: days, totalDays: dayCount };
  }, [actualCalendarMode, hebrewYear, hebrewMonth]);

  // Generate Gregorian month view with proper overlapping days
  const gregorianCalendarGrid = useMemo(() => {
    if (actualCalendarMode !== 'gregorian') {
      return null;
    }

    const days: (GregorianDay | null)[][] = [];
    let currentWeek: (GregorianDay | null)[] = [];

    // Get first and last day of month
    const firstDay = new Date(gregorianYear, gregorianMonth, 1);
    const lastDay = new Date(gregorianYear, gregorianMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstWeekday = firstDay.getDay();

    // Add previous month days to fill first week
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = new Date(gregorianYear, gregorianMonth, -i); // This goes backward from the 1st
      currentWeek.push({
        gregorianDay: date.getDate(),
        gregorianMonth: date.getMonth(),
        gregorianYear: date.getFullYear(),
        date: date,
        weekday: date.getDay(),
        isCurrentMonth: false,
      });
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(gregorianYear, gregorianMonth, day);
      currentWeek.push({
        gregorianDay: day,
        gregorianMonth: gregorianMonth,
        gregorianYear: gregorianYear,
        date: date,
        weekday: date.getDay(),
        isCurrentMonth: true,
      });

      if (currentWeek.length === 7) {
        days.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // Fill remaining slots with next month days
    let nextMonthDay = 1;
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      const date = new Date(gregorianYear, gregorianMonth + 1, nextMonthDay);
      currentWeek.push({
        gregorianDay: nextMonthDay,
        gregorianMonth: gregorianMonth + 1,
        gregorianYear: date.getFullYear(), // Use date.getFullYear() to handle year rollover
        date: date,
        weekday: date.getDay(),
        isCurrentMonth: false,
      });
      nextMonthDay++;
    }
    if (currentWeek.length > 0) {
      days.push(currentWeek);
    }

    return { weeks: days, totalDays: daysInMonth };
  }, [actualCalendarMode, gregorianYear, gregorianMonth]);

  // Navigation functions using proper Hebrew month arithmetic
  const navigateHebrewMonth = (direction: 'prev' | 'next') => {
    // FIXED: Correct HDate constructor order is (day, month, year)
    const currentDate = new HDate(1, hebrewMonth, hebrewYear);
    const currentMonth = currentDate.getMonth(); // Get numeric month (1-13)
    const currentYear = currentDate.getFullYear();

    let newMonth: number;
    let newYear: number;

    if (direction === 'next') {
      // Check if current year is a leap year to handle month count properly
      const monthsInCurrentYear = currentDate.isLeapYear() ? 13 : 12;

      if (currentMonth < monthsInCurrentYear) {
        newMonth = currentMonth + 1;
        newYear = currentYear;
      } else {
        newMonth = 1; // Tishrei (start of new year)
        newYear = currentYear + 1;
      }
    } else {
      if (currentMonth > 1) {
        newMonth = currentMonth - 1;
        newYear = currentYear;
      } else {
        // Going to previous year's last month
        newYear = currentYear - 1;
        const prevYearDate = new HDate(1, 1, newYear);
        newMonth = prevYearDate.isLeapYear() ? 13 : 12;
      }
    }

    // Create new date and get its month name
    const targetDate = new HDate(1, newMonth, newYear);
    setHebrewYear(newYear);
    setHebrewMonth(targetDate.getMonthName());
  };

  const navigateGregorianMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (gregorianMonth === 11) {
        setGregorianMonth(0);
        setGregorianYear(gregorianYear + 1);
      } else {
        setGregorianMonth(gregorianMonth + 1);
      }
    } else {
      if (gregorianMonth === 0) {
        setGregorianMonth(11);
        setGregorianYear(gregorianYear - 1);
      } else {
        setGregorianMonth(gregorianMonth - 1);
      }
    }
  };

  // Get current month display name with secondary calendar info
  const getCurrentMonthName = () => {
    if (actualCalendarMode === 'hebrew') {
      // Primary: Hebrew month and year
      const hebrewMonthName =
        i18n.language === 'he'
          ? Locale.gettext(hebrewMonth, 'he') || hebrewMonth
          : hebrewMonth;
      const yearDisplay =
        i18n.language === 'he' ? gematriya(hebrewYear) : hebrewYear;

      // Secondary: Calculate corresponding Gregorian months for this Hebrew month
      const firstDayHebrew = new HDate(1, hebrewMonth, hebrewYear);
      const lastDayHebrew = new HDate(
        hebrewCalendarGrid?.totalDays || 29,
        hebrewMonth,
        hebrewYear,
      );

      const firstGregorianDate = firstDayHebrew.greg();
      const lastGregorianDate = lastDayHebrew.greg();

      const firstGregMonth = firstGregorianDate.getMonth();
      const lastGregMonth = lastGregorianDate.getMonth();
      const firstGregYear = firstGregorianDate.getFullYear();
      const lastGregYear = lastGregorianDate.getFullYear();

      let gregorianInfo = '';
      if (firstGregMonth === lastGregMonth && firstGregYear === lastGregYear) {
        // Same month and year
        const monthName =
          i18n.language === 'he'
            ? GREGORIAN_MONTHS_HE[firstGregMonth]
            : GREGORIAN_MONTHS_EN[firstGregMonth];
        gregorianInfo = `${monthName} ${firstGregYear}`;
      } else if (firstGregYear === lastGregYear) {
        // Same year, different months
        const firstMonthName =
          i18n.language === 'he'
            ? GREGORIAN_MONTHS_HE[firstGregMonth]
            : GREGORIAN_MONTHS_EN[firstGregMonth];
        const lastMonthName =
          i18n.language === 'he'
            ? GREGORIAN_MONTHS_HE[lastGregMonth]
            : GREGORIAN_MONTHS_EN[lastGregMonth];
        gregorianInfo = `${firstMonthName}-${lastMonthName} ${firstGregYear}`;
      } else {
        // Different years
        const firstMonthName =
          i18n.language === 'he'
            ? GREGORIAN_MONTHS_HE[firstGregMonth]
            : GREGORIAN_MONTHS_EN[firstGregMonth];
        const lastMonthName =
          i18n.language === 'he'
            ? GREGORIAN_MONTHS_HE[lastGregMonth]
            : GREGORIAN_MONTHS_EN[lastGregMonth];
        gregorianInfo = `${firstMonthName} ${firstGregYear}-${lastMonthName} ${lastGregYear}`;
      }

      return `${hebrewMonthName} ${yearDisplay} (${gregorianInfo})`;
    } else {
      // Primary: Gregorian month and year
      const gregorianMonthName =
        i18n.language === 'he'
          ? GREGORIAN_MONTHS_HE[gregorianMonth]
          : GREGORIAN_MONTHS_EN[gregorianMonth];

      // Secondary: Calculate corresponding Hebrew months for this Gregorian month
      const firstDayGregorian = new Date(gregorianYear, gregorianMonth, 1);
      const lastDayGregorian = new Date(gregorianYear, gregorianMonth + 1, 0);

      const firstHebrewDate = new HDate(firstDayGregorian);
      const lastHebrewDate = new HDate(lastDayGregorian);

      const firstHebMonth = firstHebrewDate.getMonthName();
      const lastHebMonth = lastHebrewDate.getMonthName();
      const firstHebYear = firstHebrewDate.getFullYear();
      const lastHebYear = lastHebrewDate.getFullYear();

      let hebrewInfo = '';
      if (firstHebMonth === lastHebMonth && firstHebYear === lastHebYear) {
        // Same month and year
        const monthName =
          i18n.language === 'he'
            ? Locale.gettext(firstHebMonth, 'he') || firstHebMonth
            : firstHebMonth;
        const yearDisplay =
          i18n.language === 'he' ? gematriya(firstHebYear) : firstHebYear;
        hebrewInfo = `${monthName} ${yearDisplay}`;
      } else if (firstHebYear === lastHebYear) {
        // Same year, different months
        const firstMonthName =
          i18n.language === 'he'
            ? Locale.gettext(firstHebMonth, 'he') || firstHebMonth
            : firstHebMonth;
        const lastMonthName =
          i18n.language === 'he'
            ? Locale.gettext(lastHebMonth, 'he') || lastHebMonth
            : lastHebMonth;
        const yearDisplay =
          i18n.language === 'he' ? gematriya(firstHebYear) : firstHebYear;
        hebrewInfo = `${firstMonthName}-${lastMonthName} ${yearDisplay}`;
      } else {
        // Different years
        const firstMonthName =
          i18n.language === 'he'
            ? Locale.gettext(firstHebMonth, 'he') || firstHebMonth
            : firstHebMonth;
        const lastMonthName =
          i18n.language === 'he'
            ? Locale.gettext(lastHebMonth, 'he') || lastHebMonth
            : lastHebMonth;
        const firstYearDisplay =
          i18n.language === 'he' ? gematriya(firstHebYear) : firstHebYear;
        const lastYearDisplay =
          i18n.language === 'he' ? gematriya(lastHebYear) : lastHebYear;
        hebrewInfo = `${firstMonthName} ${firstYearDisplay}-${lastMonthName} ${lastYearDisplay}`;
      }

      return `${gregorianMonthName} ${gregorianYear} (${hebrewInfo})`;
    }
  };

  // Get Hebrew date for Gregorian day
  const getHebrewDate = (gregorianDate: Date) => {
    const hdate = new HDate(gregorianDate);
    const monthName = hdate.getMonthName();

    if (i18n.language === 'he') {
      const hebrewMonthName = Locale.gettext(monthName, 'he') || monthName;
      return {
        day: gematriya(hdate.getDate()),
        month: hebrewMonthName, // Full Hebrew month name
      };
    } else {
      return {
        day: hdate.getDate().toString(),
        month: monthName, // Full English month name
      };
    }
  };

  // Get Gregorian date for Hebrew day
  const getGregorianDate = (hebrewDay: HebrewDay) => {
    const monthNames =
      i18n.language === 'he' ? GREGORIAN_MONTHS_HE : GREGORIAN_MONTHS_EN;
    return {
      day: hebrewDay.gregorianDate.getDate(),
      month: monthNames[hebrewDay.gregorianDate.getMonth()].slice(0, 3),
    };
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return occurrences.filter((event) => event.date.toDateString() === dateStr);
  };

  // Calculate cell width for content strategy (only width matters for responsive content)
  const getCellWidth = () => {
    const width = window.innerWidth;
    
    if (layoutType === LayoutType.LANDSCAPE_PHONE) {
      // In landscape, subtract events panel width and margins
      return Math.floor((width - 192 - 12) / 7); // Panel is 192px (w-48) + gap
    } else if (layoutType === LayoutType.PORTRAIT_PHONE) {
      return Math.floor((width - 32) / 7); // Side margins
    } else if (layoutType === LayoutType.TINY_MOBILE) {
      return Math.floor((width - 24) / 7); // Smaller margins
    } else {
      // Desktop/tablet
      const availableWidth = Math.min(width - 320 - 48, 800); // Events panel + margins, max 800px
      return Math.floor(availableWidth / 7);
    }
  };

  // Determine cell content strategy based on dimensions
  const getCellContentStrategy = (cellWidth: number, cellHeight: number) => {
    // Define breakpoints
    const isWide = cellWidth >= 100;
    const isMediumWidth = cellWidth >= 80;
    const isTall = cellHeight >= 80;
    const isMediumHeight = cellHeight >= 60;
    const isShort = cellHeight < 40;
    
    if (isTall && isWide) {
      // Large cells: show everything (desktop)
      return {
        showSecondaryDate: true,
        showSecondaryMonth: true,
        showEventTitles: true,
        maxEventTitles: 3,
        showEventCount: true,
        layout: 'full',
        primaryDateSize: 'text-lg',
        secondaryDateSize: 'text-xs'
      };
    }
    
    if (isTall && isMediumWidth) {
      // Tall but medium width: multiple lines, no month names
      return {
        showSecondaryDate: true,
        showSecondaryMonth: false,
        showEventTitles: true,
        maxEventTitles: 2,
        showEventCount: true,
        layout: 'tall-medium',
        primaryDateSize: 'text-base',
        secondaryDateSize: 'text-xs'
      };
    }
    
    if (isMediumHeight && isWide) {
      // Medium height but wide: show month names, no event titles
      return {
        showSecondaryDate: true,
        showSecondaryMonth: true,
        showEventTitles: false,
        maxEventTitles: 0,
        showEventCount: true,
        layout: 'wide-medium',
        primaryDateSize: 'text-base',
        secondaryDateSize: 'text-xs'
      };
    }
    
    if (isMediumHeight && isMediumWidth) {
      // Medium cells: no month names, no event titles, just indicators
      return {
        showSecondaryDate: true,
        showSecondaryMonth: false,
        showEventTitles: false,
        maxEventTitles: 0,
        showEventCount: true,
        layout: 'medium',
        primaryDateSize: 'text-sm',
        secondaryDateSize: 'text-xs'
      };
    }
    
    if (isShort) {
      // Super short cells: inline dates, event indicator only
      return {
        showSecondaryDate: true,
        showSecondaryMonth: false,
        showEventTitles: false,
        maxEventTitles: 0,
        showEventCount: true,
        layout: 'compact-inline',
        primaryDateSize: 'text-sm',
        secondaryDateSize: 'text-xs'
      };
    }
    
    // Default: minimal layout
    return {
      showSecondaryDate: false,
      showSecondaryMonth: false,
      showEventTitles: false,
      maxEventTitles: 0,
      showEventCount: true,
      layout: 'minimal',
      primaryDateSize: 'text-sm',
      secondaryDateSize: 'text-xs'
    };
  };

  // Get the current cell width for content strategy
  const currentCellWidth = getCellWidth();
  // Cell content strategy based on width only - height will be determined by CSS
  const cellContentStrategy = getCellContentStrategy(currentCellWidth, 50); // Use a standard height for strategy

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const eventsForDay = getEventsForDate(date);

    if (eventsForDay.length === 0) {
      // No events, open create modal
      setIsModalOpen(true);
    } else if (isSmallScreen) {
      // Small screen with events, show mobile modal
      setIsMobileEventModalOpen(true);
    }
    // On larger screens with events, the day events panel will update automatically
  };

  // Handle event click
  const handleEventClick = (event: EventOccurrence) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
  };

  // Navigate to today
  const navigateToToday = () => {
    const now = new Date();
    const hebrewDate = new HDate(now);

    setHebrewYear(hebrewDate.getFullYear());
    setHebrewMonth(hebrewDate.getMonthName());
    setGregorianYear(now.getFullYear());
    setGregorianMonth(now.getMonth());
    setSelectedDate(now);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const eventsForSelectedDate = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  return (
    <div className='h-full bg-gray-50 dark:bg-gray-900 flex flex-col'>
      {/* Calendar Header */}
      <CalendarHeader 
        isSmallScreen={isSmallScreen} 
        isLandscapePhone={isLandscapePhone}
        calendarHeight={calendarHeight}
      />

      {/* Mobile Modal for Event Display */}
      {isMobileEventModalOpen && selectedDate && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full max-h-[80vh] overflow-y-auto'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {selectedDate.toLocaleDateString(
                    i18n.language === 'he' ? 'he-IL' : 'en-US',
                  )}
                </h2>
                <button
                  onClick={() => setIsMobileEventModalOpen(false)}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  ✕
                </button>
              </div>
            </div>
            <DayEvents
              selectedDate={selectedDate}
              events={eventsForSelectedDate}
              onEventClick={handleEventClick}
              onAddEventClick={() => {
                setIsMobileEventModalOpen(false);
                setIsModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Event Creation/Edit Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {selectedEvent ? t('Edit Event') : t('Create New Event')}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                  }}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  ✕
                </button>
              </div>
            </div>
            <div className='p-4'>
              <EventForm
                selectedDate={selectedDate}
                onAddEvent={async (eventData) => {
                  try {
                    if (selectedEvent) {
                      // Convert EventOccurrence back to Event for updating
                      const updateData = {
                        id: selectedEvent.id,
                        title: eventData.title,
                        description: eventData.description,
                        hebrew_year: eventData.hebrew_year,
                        hebrew_month: eventData.hebrew_month,
                        hebrew_day: eventData.hebrew_day,
                        recurrence_rule: eventData.recurrence_rule,
                      };
                      await updateEvent(updateData);
                    } else {
                      await createEvent(eventData);
                    }
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error saving event:', error);
                  }
                }}
                isCreating={isCreating || isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && !isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {t('Event Details')}
                </h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                >
                  ✕
                </button>
              </div>
            </div>
            <div className='p-4'>
              <EventDetails
                event={selectedEvent}
                onDelete={async (id: string) => {
                  try {
                    await deleteEvent(id);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error deleting event:', error);
                  }
                }}
                onSave={async (event) => {
                  try {
                    // Pass the full event object to updateEvent
                    await updateEvent(event);
                    setSelectedEvent(null);
                  } catch (error) {
                    console.error('Error updating event:', error);
                  }
                }}
                isSaving={isSaving}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 w-full ${
        layoutType === LayoutType.LANDSCAPE_PHONE ? 'px-1' :
        layoutType === LayoutType.TINY_MOBILE ? 'px-2' : 'px-2 sm:px-6 lg:px-8'
      }`}>
        {layoutType === LayoutType.TINY_MOBILE ? (
          // Tiny Mobile Layout - Calendar only with modals
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3'
            dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
          >
            {/* Compact Header */}
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5'>
                <button
                  onClick={() =>
                    actualCalendarMode === 'hebrew'
                      ? navigateHebrewMonth('prev')
                      : navigateGregorianMonth('prev')
                  }
                  className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                >
                  {i18n.language === 'he' ? (
                    <ChevronRightIcon className='w-4 h-4' />
                  ) : (
                    <ChevronLeftIcon className='w-4 h-4' />
                  )}
                </button>
                <button
                  onClick={navigateToToday}
                  className='px-2 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                >
                  {t('Today')}
                </button>
                <button
                  onClick={() =>
                    actualCalendarMode === 'hebrew'
                      ? navigateHebrewMonth('next')
                      : navigateGregorianMonth('next')
                  }
                  className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                >
                  {i18n.language === 'he' ? (
                    <ChevronLeftIcon className='w-4 h-4' />
                  ) : (
                    <ChevronRightIcon className='w-4 h-4' />
                  )}
                </button>
              </div>
              <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate max-w-[150px]'>
                {getCurrentMonthName().split('(')[0].trim()}
              </h2>
              <div className='w-16'></div> {/* Spacer for balance */}
            </div>

            {/* Compact Weekday Headers */}
            <div className='grid grid-cols-7 gap-1 mb-2'>
              {weekdays.map((day) => (
                <div
                  key={day}
                  className='p-0.5 text-center text-xs font-medium text-gray-500'
                >
                  {day.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Compact Calendar Grid */}
            <div className='grid grid-cols-7 gap-1'>
              {(actualCalendarMode === 'hebrew'
                ? hebrewCalendarGrid?.weeks.flat()
                : gregorianCalendarGrid?.weeks.flat()
              )?.map((day, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (!day) {
                      return;
                    }
                    const date = actualCalendarMode === 'hebrew' && isHebrewDay(day)
                      ? day.gregorianDate
                      : isGregorianDay(day) && actualCalendarMode === 'gregorian'
                      ? day.date
                      : new Date(); // fallback
                    handleDayClick(date);
                  }}
                  className={`
                  min-h-[40px] p-1 border rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors
                  ${
                    day?.isCurrentMonth !== false
                      ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500'
                  }
                  ${day && selectedDate && (
                    (actualCalendarMode === 'hebrew' && isHebrewDay(day) && selectedDate.toDateString() === day.gregorianDate.toDateString()) ||
                    (actualCalendarMode === 'gregorian' && isGregorianDay(day) && selectedDate.toDateString() === day.date.toDateString())
                  ) ? 'ring-1 ring-blue-500' : ''}
                `}
                >
                  {day && (
                    <div className='h-full flex flex-col items-center justify-center'>
                      <div
                        className={`text-xs font-bold ${
                          day.isCurrentMonth !== false
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                          ? i18n.language === 'he'
                            ? gematriya(day.hebrewDay)
                            : day.hebrewDay
                          : isGregorianDay(day)
                          ? day.gregorianDay
                          : 0}
                      </div>
                      {(function() {
                        let dateToCheck: Date;
                        if (actualCalendarMode === 'hebrew' && isHebrewDay(day)) {
                          dateToCheck = day.gregorianDate;
                        } else if (actualCalendarMode === 'gregorian' && isGregorianDay(day)) {
                          dateToCheck = day.date;
                        } else {
                          dateToCheck = new Date(); // fallback
                        }
                        return getEventsForDate(dateToCheck).length > 0;
                      })() && (
                        <div className='w-1 h-1 bg-blue-500 rounded-full mt-0.5'></div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : layoutType === LayoutType.PORTRAIT_PHONE ? (
          // Portrait Phone Layout - Stacked vertical layout with events at bottom
          <div className='flex flex-col gap-4 h-full' dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
            {/* Calendar Section */}
            <div className='flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col'>
              {/* Header */}
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5'>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('prev')
                        : navigateGregorianMonth('prev')
                    }
                    className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronRightIcon className='w-4 h-4' />
                    ) : (
                      <ChevronLeftIcon className='w-4 h-4' />
                    )}
                  </button>
                  <button
                    onClick={navigateToToday}
                    className='px-2 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                  >
                    {t('Today')}
                  </button>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('next')
                        : navigateGregorianMonth('next')
                    }
                    className='p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronLeftIcon className='w-4 h-4' />
                    ) : (
                      <ChevronRightIcon className='w-4 h-4' />
                    )}
                  </button>
                </div>
                <h2 className='text-base font-bold text-gray-900 dark:text-gray-100 text-center flex-1 min-w-0'>
                  <span className='truncate'>{getCurrentMonthName()}</span>
                </h2>
              </div>

              {/* Weekday Headers */}
              <div className='grid grid-cols-7 gap-1 mb-2'>
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className='p-1 text-center text-xs font-medium text-gray-500'
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className='flex-1 grid grid-cols-7 gap-1' style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
                {(actualCalendarMode === 'hebrew'
                  ? hebrewCalendarGrid?.weeks.flat()
                  : gregorianCalendarGrid?.weeks.flat()
                )?.map((day, index) => (
                  <div
                    key={index}
                    onClick={() =>
                      day &&
                      handleDayClick(
                        actualCalendarMode === 'hebrew' && isHebrewDay(day)
                          ? day.gregorianDate
                          : isGregorianDay(day) && actualCalendarMode === 'gregorian'
                          ? day.date
                          : new Date(), // fallback
                      )
                    }
                    className={`
                    min-h-[50px] p-1 border rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors
                    ${
                      day?.isCurrentMonth !== false
                        ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500'
                    }
                    ${day && selectedDate && (
                      (actualCalendarMode === 'hebrew' && isHebrewDay(day) && selectedDate.toDateString() === day.gregorianDate.toDateString()) ||
                      (actualCalendarMode === 'gregorian' && isGregorianDay(day) && selectedDate.toDateString() === day.date.toDateString())
                    ) ? 'ring-2 ring-blue-500' : ''}
                  `}
                  >
                    {day && (
                      <div className='h-full flex flex-col'>
                        <div
                          className={`text-sm font-bold mb-0.5 ${
                            day.isCurrentMonth !== false
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                            ? i18n.language === 'he'
                              ? gematriya(day.hebrewDay)
                              : day.hebrewDay
                            : isGregorianDay(day)
                            ? day.gregorianDay
                            : 0}
                        </div>
                        <div className='text-xs text-gray-500 dark:text-gray-400'>
                          {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                            ? getGregorianDate(day).day
                            : actualCalendarMode === 'gregorian' && isGregorianDay(day)
                            ? getHebrewDate(day.date).day
                            : ''}
                        </div>
                        <div className='flex-1 mt-1'>
                          {(function() {
                            let dateToCheck: Date;
                            if (actualCalendarMode === 'hebrew' && isHebrewDay(day)) {
                              dateToCheck = day.gregorianDate;
                            } else if (actualCalendarMode === 'gregorian' && isGregorianDay(day)) {
                              dateToCheck = day.date;
                            } else {
                              return null; // fallback
                            }
                            const dayEvents = getEventsForDate(dateToCheck);
                            return (
                              <>
                                {dayEvents
                                  .slice(0, 1)
                                  .map((event, idx) => (
                                    <div
                                      key={idx}
                                      className='text-xs bg-blue-100 text-blue-800 p-1 rounded truncate'
                                    >
                                      {event.title}
                                    </div>
                                  ))}
                                {dayEvents.length > 1 && (
                                  <div className='text-xs text-gray-500 text-center'>
                                    +{dayEvents.length - 1}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Events Section - Fixed height at bottom */}
            <div className='h-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-shrink-0'>
              <DayEvents
                selectedDate={selectedDate}
                events={eventsForSelectedDate}
                onEventClick={handleEventClick}
                onAddEventClick={() => setIsModalOpen(true)}
              />
            </div>
          </div>
        ) : layoutType === LayoutType.LANDSCAPE_PHONE ? (
          // Landscape Phone Layout - Horizontal split: 2/3 calendar, 1/3 events
          <div
            className='flex gap-2 h-full'
            dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
          >
            {/* Calendar Container - Takes 2/3 of available width */}
            <div className='w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              {/* Calendar Header - Reduced height */}
              <div className='h-10 flex items-center justify-between px-1 flex-shrink-0 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded p-0.5'>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('prev')
                        : navigateGregorianMonth('prev')
                    }
                    className='p-1 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronRightIcon className='w-3 h-3' />
                    ) : (
                      <ChevronLeftIcon className='w-3 h-3' />
                    )}
                  </button>
                  <button
                    onClick={navigateToToday}
                    className='px-1.5 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                  >
                    {t('Today')}
                  </button>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('next')
                        : navigateGregorianMonth('next')
                    }
                    className='p-1 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronLeftIcon className='w-3 h-3' />
                    ) : (
                      <ChevronRightIcon className='w-3 h-3' />
                    )}
                  </button>
                </div>
                <h2 className='text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]'>
                  {getCurrentMonthName().split('(')[0].trim()}
                </h2>
              </div>

              {/* Weekday Headers - Reduced height */}
              <div className='h-6 grid grid-cols-7 gap-0.5 px-1 flex-shrink-0 bg-gray-50 dark:bg-gray-900'>
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className='flex items-center justify-center text-xs font-medium text-gray-500'
                  >
                    {day.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid - Takes all remaining space, equal height cells */}
              <div className='flex-1 grid grid-cols-7 gap-0.5 p-1' style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
                {(actualCalendarMode === 'hebrew'
                  ? hebrewCalendarGrid?.weeks.flat()
                  : gregorianCalendarGrid?.weeks.flat()
                )?.map((day, index) => {
                  // Get events for this day
                  let dateToCheck: Date;
                  let dayEvents: EventOccurrence[] = [];
                  
                  if (actualCalendarMode === 'hebrew' && isHebrewDay(day)) {
                    dateToCheck = day.gregorianDate;
                    dayEvents = getEventsForDate(dateToCheck);
                  } else if (actualCalendarMode === 'gregorian' && isGregorianDay(day)) {
                    dateToCheck = day.date;
                    dayEvents = getEventsForDate(dateToCheck);
                  }
                  
                  return (
                    <div
                      key={index}
                      onClick={() => day && handleDayClick(dateToCheck || new Date())}
                      className={`
                        calendar-cell border rounded cursor-pointer transition-colors
                        ${
                          day?.isCurrentMonth !== false
                            ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent not-current-month'
                        }
                        ${day && selectedDate && (
                          (actualCalendarMode === 'hebrew' && isHebrewDay(day) && selectedDate.toDateString() === day.gregorianDate.toDateString()) ||
                          (actualCalendarMode === 'gregorian' && isGregorianDay(day) && selectedDate.toDateString() === day.date.toDateString())
                        ) ? 'selected' : ''}
                      `}
                    >
                      {day && (
                        <div className='calendar-cell-content'>
                          <div className='calendar-cell-primary-date text-gray-900 dark:text-gray-100'>
                            {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                              ? i18n.language === 'he' ? gematriya(day.hebrewDay) : day.hebrewDay
                              : isGregorianDay(day) ? day.gregorianDay : ''}
                          </div>
                          <div className='calendar-cell-secondary-date text-gray-500 dark:text-gray-400'>
                            {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                              ? getGregorianDate(day).day
                              : isGregorianDay(day) ? getHebrewDate(day.date).day : ''}
                          </div>
                          <div className='calendar-cell-secondary-month text-gray-500 dark:text-gray-400 hidden'>
                            {actualCalendarMode === 'hebrew' && isHebrewDay(day)
                              ? getGregorianDate(day).month
                              : isGregorianDay(day) ? getHebrewDate(day.date).month.slice(0, 3) : ''}
                          </div>
                          <div className='calendar-cell-events'>
                            {dayEvents.map((event, idx) => (
                              <div 
                                key={idx} 
                                className='calendar-cell-event bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 0 && (
                              <>
                                <div className='calendar-cell-event-indicator'></div>
                                {dayEvents.length > 1 && (
                                  <div className='calendar-cell-event-count'>+{dayEvents.length - 1}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events Section - Takes 1/3 of available width */}
            <div className='w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              <DayEvents
                selectedDate={selectedDate}
                events={eventsForSelectedDate}
                onEventClick={handleEventClick}
                onAddEventClick={() => setIsModalOpen(true)}
              />
            </div>
          </div>
        ) : (
          // Desktop & Large Tablet Layout - Side-by-side with adapted panel width
          <div
            className='flex gap-6 h-full'
            dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
          >
            {/* Calendar */}
            <div
              className='flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col'
              dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5'>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('prev')
                        : navigateGregorianMonth('prev')
                    }
                    className='p-2 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronRightIcon className='w-5 h-5' />
                    ) : (
                      <ChevronLeftIcon className='w-5 h-5' />
                    )}
                  </button>
                  <button
                    onClick={navigateToToday}
                    className='px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                  >
                    {t('Today')}
                  </button>
                  <button
                    onClick={() =>
                      actualCalendarMode === 'hebrew'
                        ? navigateHebrewMonth('next')
                        : navigateGregorianMonth('next')
                    }
                    className='p-2 rounded hover:bg-white dark:hover:bg-gray-600 transition-colors'
                  >
                    {i18n.language === 'he' ? (
                      <ChevronLeftIcon className='w-5 h-5' />
                    ) : (
                      <ChevronRightIcon className='w-5 h-5' />
                    )}
                  </button>
                </div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                  {getCurrentMonthName()}
                </h2>
                <div className='w-32'></div> {/* Spacer for balance */}
              </div>

              {/* Weekday Headers */}
              <div className='grid grid-cols-7 gap-1 mb-2'>
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className='p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400'
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className='flex-1 grid grid-cols-7 gap-1' style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
                {actualCalendarMode === 'hebrew' && hebrewCalendarGrid
                  ? hebrewCalendarGrid.weeks.flat().map((day, index) => (
                      <div
                        key={index}
                        onClick={() => day && handleDayClick(day.gregorianDate)}
                        className={`
                        min-h-[80px] p-2 border rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors
                        ${
                          day?.isCurrentMonth !== false
                            ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500'
                        }
                        ${day && selectedDate?.toDateString() === day.gregorianDate.toDateString() ? 'ring-2 ring-blue-500' : ''}
                      `}
                      >
                        {day && (
                          <div className='h-full flex flex-col'>
                            <div
                              className={`text-lg font-bold mb-1 ${
                                day.isCurrentMonth !== false
                                  ? 'text-gray-900 dark:text-gray-100'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {i18n.language === 'he'
                                ? gematriya(day.hebrewDay)
                                : day.hebrewDay}
                            </div>
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                              {getGregorianDate(day).day}{' '}
                              {getGregorianDate(day).month}
                            </div>
                            <div className='flex-1 mt-1'>
                              {getEventsForDate(day.gregorianDate)
                                .slice(0, 3)
                                .map((event, idx) => (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                    className='text-xs bg-blue-100 text-blue-800 p-1 mb-1 rounded cursor-pointer hover:bg-blue-200 truncate'
                                  >
                                    {event.title}
                                  </div>
                                ))}
                              {getEventsForDate(day.gregorianDate).length >
                                3 && (
                                <div className='text-xs text-gray-500'>
                                  +
                                  {getEventsForDate(day.gregorianDate).length -
                                    3}{' '}
                                  more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  : gregorianCalendarGrid
                    ? gregorianCalendarGrid.weeks.flat().map((day, index) => (
                        <div
                          key={index}
                          onClick={() => day && handleDayClick(day.date)}
                          className={`
                        min-h-[80px] p-2 border rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors
                        ${
                          day?.isCurrentMonth
                            ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500'
                        }
                        ${day && selectedDate?.toDateString() === day.date.toDateString() ? 'ring-2 ring-blue-500' : ''}
                      `}
                        >
                          {day && (
                            <div className='h-full flex flex-col'>
                              <div
                                className={`text-lg font-bold mb-1 ${
                                  day.isCurrentMonth
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {day.gregorianDay}
                              </div>
                              <div className='text-xs text-gray-500 dark:text-gray-400'>
                                {getHebrewDate(day.date).day}{' '}
                                {getHebrewDate(day.date).month}
                              </div>
                              <div className='flex-1 mt-1'>
                                {getEventsForDate(day.date)
                                  .slice(0, 3)
                                  .map((event, idx) => (
                                    <div
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                      }}
                                      className='text-xs bg-blue-100 text-blue-800 p-1 mb-1 rounded cursor-pointer hover:bg-blue-200 truncate'
                                    >
                                      {event.title}
                                    </div>
                                  ))}
                                {getEventsForDate(day.date).length > 3 && (
                                  <div className='text-xs text-gray-500'>
                                    +{getEventsForDate(day.date).length - 3}{' '}
                                    more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    : null}
              </div>

              {/* Legend */}
              <div className='mt-4 text-xs text-gray-500 dark:text-gray-400 text-center'>
                {actualCalendarMode === 'hebrew'
                  ? i18n.language === 'he'
                    ? `מציג חודשים עבריים • התאריכים הגרגוריאניים מוצגים בקטן`
                    : `Showing Hebrew months • Gregorian dates shown small`
                  : i18n.language === 'he'
                    ? `מציג חודשים גרגוריאניים • התאריכים העבריים מוצגים בקטן`
                    : `Showing Gregorian months • Hebrew dates shown small`}
              </div>
            </div>

            {/* Events Panel - Adaptive width */}
            <div
              className={`${layoutType === LayoutType.LARGE_TABLET ? 'w-72' : 'w-80'} bg-white dark:bg-gray-800 rounded-lg shadow-lg`}
            >
              <DayEvents
                selectedDate={selectedDate}
                events={eventsForSelectedDate}
                onEventClick={handleEventClick}
                onAddEventClick={() => setIsModalOpen(true)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
