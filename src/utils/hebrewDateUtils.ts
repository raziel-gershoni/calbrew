import { HDate, Locale, gematriya } from '@hebcal/core';

export interface HebrewDateRange {
  startYear: number;
  endYear: number;
}

export interface EventOccurrence {
  id: string;
  title: string;
  description: string;
  hebrew_year: number;
  hebrew_month: number;
  hebrew_day: number;
  recurrence_rule: string;
  date: Date;
  anniversary?: number;
}

/**
 * Calculate Hebrew year range for a given Gregorian date range
 */
export function getHebrewYearRange(
  startDate: Date,
  endDate: Date,
): HebrewDateRange {
  const startYear = new HDate(startDate).getFullYear();
  const endYear = new HDate(endDate).getFullYear();
  return { startYear, endYear };
}

/**
 * Convert Hebrew date to Gregorian date
 */
export function hebrewToGregorian(
  day: number,
  month: number,
  year: number,
): Date {
  const hebrewDate = new HDate(day, month, year);
  return hebrewDate.greg();
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date,
): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Calculate anniversary number for an event
 */
export function calculateAnniversary(
  currentYear: number,
  originalYear: number,
): number {
  return currentYear - originalYear;
}

/**
 * Format event title with anniversary if applicable
 */
export function formatEventTitle(title: string, anniversary: number): string {
  return anniversary > 0 ? `(${anniversary}) ${title}` : title;
}

/**
 * Generate event occurrences for a given date range
 */
export function generateEventOccurrences(
  events: Array<{
    id: string;
    title: string;
    description: string;
    hebrew_year: number;
    hebrew_month: number;
    hebrew_day: number;
    recurrence_rule: string;
  }>,
  startDate: Date,
  endDate: Date,
): EventOccurrence[] {
  const { startYear, endYear } = getHebrewYearRange(startDate, endDate);

  return events.flatMap((event) => {
    const occurrences: EventOccurrence[] = [];

    // Only generate occurrences for years >= the event's original year
    // This prevents showing events in years before they were created
    const effectiveStartYear = Math.max(startYear, event.hebrew_year);

    for (let year = effectiveStartYear; year <= endYear; year++) {
      const gregorianDate = hebrewToGregorian(
        event.hebrew_day,
        event.hebrew_month,
        year,
      );

      if (isDateInRange(gregorianDate, startDate, endDate)) {
        const anniversary = calculateAnniversary(year, event.hebrew_year);

        occurrences.push({
          ...event,
          date: gregorianDate,
          title: formatEventTitle(event.title, anniversary),
          anniversary,
        });
      }
    }

    return occurrences;
  });
}

/**
 * Cache for Hebrew date conversions to improve performance
 */
class HebrewDateCache {
  private cache = new Map<string, Date>();
  private maxSize = 1000; // Limit cache size to prevent memory issues

  private getCacheKey(day: number, month: number, year: number): string {
    return `${day}-${month}-${year}`;
  }

  get(day: number, month: number, year: number): Date | undefined {
    const key = this.getCacheKey(day, month, year);
    return this.cache.get(key);
  }

  set(day: number, month: number, year: number, date: Date): void {
    // Simple LRU implementation - remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const key = this.getCacheKey(day, month, year);
    this.cache.set(key, date);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const hebrewDateCache = new HebrewDateCache();

/**
 * Cached version of Hebrew to Gregorian date conversion
 */
export function hebrewToGregorianCached(
  day: number,
  month: number,
  year: number,
): Date {
  const cached = hebrewDateCache.get(day, month, year);
  if (cached) {
    return cached;
  }

  const date = hebrewToGregorian(day, month, year);
  hebrewDateCache.set(day, month, year, date);
  return date;
}

/**
 * Clear the Hebrew date cache (useful for testing or memory management)
 */
export function clearHebrewDateCache(): void {
  hebrewDateCache.clear();
}

/**
 * Get overlapping Gregorian months for a Hebrew month
 */
export function getOverlappingGregorianMonths(
  hebrewMonth: string,
  hebrewYear: number,
  language: string = 'en',
): string {
  const firstDay = new HDate(1, hebrewMonth, hebrewYear);
  const firstDayGregorian = firstDay.greg();

  // Get the correct last day using HDate's daysInMonth method
  const daysInHebrewMonth = firstDay.daysInMonth();
  const lastDay = new HDate(daysInHebrewMonth, hebrewMonth, hebrewYear);
  const lastDayGregorian = lastDay.greg();

  const firstMonth = firstDayGregorian.toLocaleDateString(language, {
    month: 'long',
  });
  const lastMonth = lastDayGregorian.toLocaleDateString(language, {
    month: 'long',
  });

  if (firstMonth === lastMonth) {
    // Hebrew month falls entirely within one Gregorian month
    const year = firstDayGregorian.getFullYear();
    return `${firstMonth}, ${year}`;
  } else {
    // Hebrew month spans two Gregorian months
    const firstYear = firstDayGregorian.getFullYear();
    const lastYear = lastDayGregorian.getFullYear();
    if (firstYear === lastYear) {
      return `${firstMonth}/${lastMonth}, ${firstYear}`;
    } else {
      return `${firstMonth}, ${firstYear}/${lastMonth}, ${lastYear}`;
    }
  }
}

/**
 * Get overlapping Hebrew months for a Gregorian month
 */
export function getOverlappingHebrewMonths(
  gregorianMonth: number,
  gregorianYear: number,
  language: string = 'en',
): string {
  const firstDay = new Date(gregorianYear, gregorianMonth, 1);
  const lastDay = new Date(gregorianYear, gregorianMonth + 1, 0);

  const firstDayHebrew = new HDate(firstDay);
  const lastDayHebrew = new HDate(lastDay);

  const firstMonthName = firstDayHebrew.getMonthName();
  const lastMonthName = lastDayHebrew.getMonthName();

  // Get localized Hebrew month names if in Hebrew
  const getLocalizedHebrewMonth = (monthName: string) => {
    if (language === 'he') {
      return Locale.gettext(monthName, 'he') || monthName;
    }
    return monthName;
  };

  const localizedFirstMonth = getLocalizedHebrewMonth(firstMonthName);
  const localizedLastMonth = getLocalizedHebrewMonth(lastMonthName);

  if (firstMonthName === lastMonthName) {
    // Gregorian month falls entirely within one Hebrew month
    const year =
      language === 'he'
        ? gematriya(firstDayHebrew.getFullYear())
        : firstDayHebrew.getFullYear().toString();
    return `${localizedFirstMonth}, ${year}`;
  } else {
    // Gregorian month spans two Hebrew months
    const firstYear =
      language === 'he'
        ? gematriya(firstDayHebrew.getFullYear())
        : firstDayHebrew.getFullYear().toString();
    const lastYear =
      language === 'he'
        ? gematriya(lastDayHebrew.getFullYear())
        : lastDayHebrew.getFullYear().toString();

    if (firstDayHebrew.getFullYear() === lastDayHebrew.getFullYear()) {
      return `${localizedFirstMonth}/${localizedLastMonth}, ${firstYear}`;
    } else {
      return `${localizedFirstMonth}, ${firstYear}/${localizedLastMonth}, ${lastYear}`;
    }
  }
}

/**
 * Check if year changes within a month and return appropriate year display
 * This function is now removed as we handle years directly in the overlapping month functions
 */
