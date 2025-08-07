import { HDate } from '@hebcal/core';
import moment from 'moment';

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
  start: Date;
  end: Date;
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
  return moment(date).isBetween(startDate, endDate, undefined, '[]');
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

    for (let year = startYear; year <= endYear; year++) {
      const gregorianDate = hebrewToGregorian(
        event.hebrew_day,
        event.hebrew_month,
        year,
      );

      if (isDateInRange(gregorianDate, startDate, endDate)) {
        const anniversary = calculateAnniversary(year, event.hebrew_year);

        occurrences.push({
          ...event,
          start: gregorianDate,
          end: gregorianDate,
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
