import {
  HDate,
  Locale,
  gematriya,
  HebrewCalendar,
  Event,
  flags,
} from '@hebcal/core';

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
          id: event.id,
          title: event.title,
          description: event.description,
          hebrew_year: event.hebrew_year,
          hebrew_month: event.hebrew_month,
          hebrew_day: event.hebrew_day,
          recurrence_rule: event.recurrence_rule,
          date: gregorianDate,
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
      return `${firstMonth} - ${lastMonth}, ${firstYear}`;
    } else {
      return `${firstMonth}, ${firstYear} - ${lastMonth}, ${lastYear}`;
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
      return `${localizedFirstMonth} - ${localizedLastMonth}, ${firstYear}`;
    } else {
      return `${localizedFirstMonth}, ${firstYear} - ${localizedLastMonth}, ${lastYear}`;
    }
  }
}

/**
 * Hebrew calendar event interface
 */
export interface HebrewCalendarEvent {
  id: string;
  title: string;
  date: Date;
  hebrewDate: HDate;
  type:
    | 'holiday'
    | 'fast'
    | 'rosh_chodesh'
    | 'parsha'
    | 'omer'
    | 'molad'
    | 'special_shabbat'
    | 'minor_holiday'
    | 'modern_holiday'
    | 'other';
  flags: number;
}

/**
 * Get event type based on HebCal flags
 */
function getEventType(eventFlags: number): HebrewCalendarEvent['type'] {
  if (eventFlags & flags.CHAG || eventFlags & flags.YOM_TOV_ENDS) {
    return 'holiday';
  }
  if (eventFlags & flags.MAJOR_FAST || eventFlags & flags.MINOR_FAST) {
    return 'fast';
  }
  if (eventFlags & flags.ROSH_CHODESH) {
    return 'rosh_chodesh';
  }
  if (eventFlags & flags.PARSHA_HASHAVUA) {
    return 'parsha';
  }
  if (eventFlags & flags.OMER_COUNT) {
    return 'omer';
  }
  if (eventFlags & flags.MOLAD) {
    return 'molad';
  }
  if (eventFlags & flags.SPECIAL_SHABBAT) {
    return 'special_shabbat';
  }
  if (eventFlags & flags.MINOR_HOLIDAY) {
    return 'minor_holiday';
  }
  if (eventFlags & flags.MODERN_HOLIDAY) {
    return 'modern_holiday';
  }
  return 'other';
}

/**
 * Get Hebrew calendar events for a Hebrew month
 */
export function getHebrewEventsForHebrewMonth(
  hebrewMonth: number,
  hebrewYear: number,
  language: string = 'en',
): HebrewCalendarEvent[] {
  try {
    const events = HebrewCalendar.calendar({
      year: hebrewYear,
      month: hebrewMonth,
      isHebrewYear: true,
      il: true, // Use Israeli schedule for holidays and Torah readings
    });

    return events.map((event: Event, index: number) => {
      const hebrewDate = event.getDate();

      // Use event.render() with the proper locale for direct translation
      let title = event.render(language) || event.getDesc();

      // Convert Hebrew years to gematriya when displaying in Hebrew
      if (language === 'he' && title) {
        // Replace any 4-digit Hebrew years (5xxx) with gematriya
        title = title.replace(/\b5\d{3}\b/g, (match) => {
          const year = parseInt(match);
          return gematriya(year);
        });
      }

      return {
        id: `hebrew-event-${hebrewYear}-${hebrewMonth}-${index}`,
        title,
        date: hebrewDate.greg(),
        hebrewDate,
        type: getEventType(event.getFlags()),
        flags: event.getFlags(),
      };
    });
  } catch (error) {
    console.error('Error fetching Hebrew events for Hebrew month:', error);
    return [];
  }
}

/**
 * Get Hebrew calendar events for a Gregorian month
 */
export function getHebrewEventsForGregorianMonth(
  gregorianMonth: number, // 1-12
  gregorianYear: number,
  language: string = 'en',
): HebrewCalendarEvent[] {
  try {
    const events = HebrewCalendar.calendar({
      year: gregorianYear,
      month: gregorianMonth,
      isHebrewYear: false,
      il: true, // Use Israeli schedule for holidays and Torah readings
    });

    return events.map((event: Event, index: number) => {
      const hebrewDate = event.getDate();

      // Use event.render() with the proper locale for direct translation
      let title = event.render(language) || event.getDesc();

      // Convert Hebrew years to gematriya when displaying in Hebrew
      if (language === 'he' && title) {
        // Replace any 4-digit Hebrew years (5xxx) with gematriya
        title = title.replace(/\b5\d{3}\b/g, (match) => {
          const year = parseInt(match);
          return gematriya(year);
        });
      }

      return {
        id: `hebrew-event-${gregorianYear}-${gregorianMonth}-${index}`,
        title,
        date: hebrewDate.greg(),
        hebrewDate,
        type: getEventType(event.getFlags()),
        flags: event.getFlags(),
      };
    });
  } catch (error) {
    console.error('Error fetching Hebrew events for Gregorian month:', error);
    return [];
  }
}

/**
 * Get Hebrew calendar events for a date range using start/end dates
 */
function getHebrewEventsForDateRange(
  startDate: Date,
  endDate: Date,
  language: string = 'en',
): HebrewCalendarEvent[] {
  try {
    const events = HebrewCalendar.calendar({
      start: startDate,
      end: endDate,
      il: true, // Use Israeli schedule for holidays and Torah readings
    });

    return events.map((event: Event, index: number) => {
      const hebrewDate = event.getDate();

      // Use event.render() with the proper locale for direct translation
      let title = event.render(language) || event.getDesc();

      // Convert Hebrew years to gematriya when displaying in Hebrew
      if (language === 'he' && title) {
        // Replace any 4-digit Hebrew years (5xxx) with gematriya
        title = title.replace(/\b5\d{3}\b/g, (match) => {
          const year = parseInt(match);
          return gematriya(year);
        });
      }

      return {
        id: `hebrew-event-range-${index}`,
        title,
        date: hebrewDate.greg(),
        hebrewDate,
        type: getEventType(event.getFlags()),
        flags: event.getFlags(),
      };
    });
  } catch (error) {
    console.error('Error fetching Hebrew events for date range:', error);
    return [];
  }
}

/**
 * Get Hebrew calendar events for a specific date range (renamed export)
 * Uses the exact date range from the calendar grid to show events in overlapping days
 */
export function getHebrewEventsForCalendarRange(
  startDate: Date,
  endDate: Date,
  language: string = 'en',
): HebrewCalendarEvent[] {
  return getHebrewEventsForDateRange(startDate, endDate, language);
}
