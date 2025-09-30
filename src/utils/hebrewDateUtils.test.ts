/**
 * Tests for Hebrew Date Utilities
 * Priority 1: Critical business logic with complex date conversions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHebrewYearRange,
  hebrewToGregorian,
  isDateInRange,
  calculateAnniversary,
  formatEventTitle,
  generateEventOccurrences,
  hebrewToGregorianCached,
  clearHebrewDateCache,
} from './hebrewDateUtils';

describe('getHebrewYearRange', () => {
  it('should calculate Hebrew year range for Gregorian dates', () => {
    // Sept 2024 - Sept 2025 covers Hebrew years 5785-5786
    const start = new Date('2024-09-01');
    const end = new Date('2025-09-01');

    const result = getHebrewYearRange(start, end);

    expect(result.startYear).toBe(5784); // Elul 5784
    expect(result.endYear).toBe(5785); // Elul 5785
  });

  it('should handle same year range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');

    const result = getHebrewYearRange(start, end);

    expect(result.startYear).toBe(5784);
    expect(result.endYear).toBe(5784);
  });

  it('should handle multi-year range', () => {
    const start = new Date('2023-01-01');
    const end = new Date('2025-12-31');

    const result = getHebrewYearRange(start, end);

    expect(result.endYear).toBeGreaterThan(result.startYear);
    expect(result.endYear - result.startYear).toBeGreaterThanOrEqual(2);
  });
});

describe('hebrewToGregorian', () => {
  it('should convert Rosh Hashanah 5785 correctly', () => {
    // 1 Tishrei 5785 = Oct 3, 2024
    const result = hebrewToGregorian(1, 7, 5785); // Tishrei = month 7

    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(9); // October (0-indexed)
    expect(result.getDate()).toBe(3);
  });

  it('should convert Passover 5784 correctly', () => {
    // 15 Nisan 5784 = April 23, 2024
    const result = hebrewToGregorian(15, 1, 5784); // Nisan = month 1

    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(23);
  });

  it('should handle leap year months (Adar I and Adar II)', () => {
    // 5784 is a leap year with Adar I (month 13) and Adar II (month 14 = Adar in @hebcal)
    const adarI = hebrewToGregorian(15, 13, 5784); // Adar I
    const adarII = hebrewToGregorian(15, 14, 5784); // Adar II

    expect(adarI).toBeInstanceOf(Date);
    expect(adarII).toBeInstanceOf(Date);
    expect(adarII.getTime()).toBeGreaterThan(adarI.getTime());
  });

  it('should handle month boundaries correctly', () => {
    // Last day of month
    const lastDay = hebrewToGregorian(29, 8, 5785); // Cheshvan = month 8
    // First day of next month
    const firstDay = hebrewToGregorian(1, 9, 5785); // Kislev = month 9

    expect(lastDay).toBeInstanceOf(Date);
    expect(firstDay).toBeInstanceOf(Date);
    expect(firstDay.getTime()).toBeGreaterThan(lastDay.getTime());
  });

  it('should handle year boundaries', () => {
    // Last day of year 5784
    const lastDay5784 = hebrewToGregorian(29, 6, 5784); // Elul = month 6
    // First day of year 5785
    const firstDay5785 = hebrewToGregorian(1, 7, 5785); // Tishrei = month 7

    expect(firstDay5785.getTime()).toBeGreaterThan(lastDay5784.getTime());
    // Should be consecutive days
    const daysDiff = (firstDay5785.getTime() - lastDay5784.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(1, 0);
  });
});

describe('isDateInRange', () => {
  it('should return true for date within range', () => {
    const date = new Date('2024-06-15');
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');

    expect(isDateInRange(date, start, end)).toBe(true);
  });

  it('should return true for date at range boundaries (inclusive)', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');

    expect(isDateInRange(start, start, end)).toBe(true);
    expect(isDateInRange(end, start, end)).toBe(true);
  });

  it('should return false for date before range', () => {
    const date = new Date('2023-12-31');
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');

    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should return false for date after range', () => {
    const date = new Date('2025-01-01');
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');

    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should handle single day range', () => {
    const date = new Date('2024-06-15');
    const sameDate = new Date('2024-06-15');

    expect(isDateInRange(date, sameDate, sameDate)).toBe(true);
  });
});

describe('calculateAnniversary', () => {
  it('should calculate anniversary number correctly', () => {
    expect(calculateAnniversary(5785, 5780)).toBe(5);
  });

  it('should return 0 for same year (no anniversary)', () => {
    expect(calculateAnniversary(5784, 5784)).toBe(0);
  });

  it('should handle negative differences (should not happen but mathematically valid)', () => {
    expect(calculateAnniversary(5780, 5785)).toBe(-5);
  });

  it('should handle large anniversary numbers', () => {
    expect(calculateAnniversary(5784, 5684)).toBe(100); // 100th anniversary
  });
});

describe('formatEventTitle', () => {
  it('should add anniversary prefix for anniversaries', () => {
    expect(formatEventTitle('Birthday', 5)).toBe('(5) Birthday');
  });

  it('should not add prefix for original event (anniversary = 0)', () => {
    expect(formatEventTitle('Birthday', 0)).toBe('Birthday');
  });

  it('should handle single anniversary', () => {
    expect(formatEventTitle('Wedding', 1)).toBe('(1) Wedding');
  });

  it('should handle large anniversary numbers', () => {
    expect(formatEventTitle('Anniversary', 100)).toBe('(100) Anniversary');
  });

  it('should preserve emoji and special characters', () => {
    expect(formatEventTitle('🎂 Birthday Party! 🎉', 5)).toBe('(5) 🎂 Birthday Party! 🎉');
  });
});

describe('generateEventOccurrences', () => {
  beforeEach(() => {
    clearHebrewDateCache(); // Clear cache before each test
  });

  it('should generate occurrences for yearly recurring event', () => {
    const events = [{
      id: '1',
      title: 'Birthday',
      description: 'My birthday',
      hebrew_year: 5784,
      hebrew_month: 7, // Tishrei is month 7
      hebrew_day: 15,
      recurrence_rule: 'yearly',
    }];

    // Range covering multiple Hebrew years (Sept 2023 - Oct 2025)
    const start = new Date('2023-09-01');
    const end = new Date('2025-10-01');

    const occurrences = generateEventOccurrences(events, start, end);

    // Should have occurrences in 5784 and 5785
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(occurrences[0].title).toBe('Birthday');
  });

  it('should not generate occurrences before event creation year', () => {
    const events = [{
      id: '1',
      title: 'Future Event',
      description: 'Created in 5785',
      hebrew_year: 5785,
      hebrew_month: 7, // Tishrei
      hebrew_day: 1,
      recurrence_rule: 'yearly',
    }];

    // Range in 5784 (before event was created)
    const start = new Date('2023-09-01');
    const end = new Date('2024-09-01');

    const occurrences = generateEventOccurrences(events, start, end);

    expect(occurrences.length).toBe(0); // No occurrences before creation year
  });

  it('should calculate correct anniversary numbers', () => {
    const events = [{
      id: '1',
      title: 'Anniversary',
      description: 'Test',
      hebrew_year: 5780,
      hebrew_month: 1, // Nisan
      hebrew_day: 15,
      recurrence_rule: 'yearly',
    }];

    const start = new Date('2024-01-01');
    const end = new Date('2025-12-31');

    const occurrences = generateEventOccurrences(events, start, end);

    expect(occurrences.length).toBeGreaterThan(0);
    // Should have anniversary of 4 or 5 depending on exact dates
    const anniversaries = occurrences.map(o => o.anniversary);
    expect(Math.min(...anniversaries)).toBeGreaterThanOrEqual(4);
  });

  it('should only include dates within Gregorian range', () => {
    const events = [{
      id: '1',
      title: 'Event',
      description: 'Test',
      hebrew_year: 5784,
      hebrew_month: 7, // Tishrei
      hebrew_day: 1,
      recurrence_rule: 'yearly',
    }];

    const start = new Date('2024-10-01');
    const end = new Date('2024-10-05');

    const occurrences = generateEventOccurrences(events, start, end);

    // All occurrences should be within the range
    occurrences.forEach(occurrence => {
      expect(occurrence.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(occurrence.date.getTime()).toBeLessThanOrEqual(end.getTime());
    });
  });

  it('should handle multiple events', () => {
    const events = [
      {
        id: '1',
        title: 'Event 1',
        description: 'First event',
        hebrew_year: 5784,
        hebrew_month: 7, // Tishrei
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      },
      {
        id: '2',
        title: 'Event 2',
        description: 'Second event',
        hebrew_year: 5784,
        hebrew_month: 1, // Nisan
        hebrew_day: 15,
        recurrence_rule: 'yearly',
      },
    ];

    const start = new Date('2024-01-01');
    const end = new Date('2025-12-31');

    const occurrences = generateEventOccurrences(events, start, end);

    expect(occurrences.length).toBeGreaterThan(2);
    const event1Occurrences = occurrences.filter(o => o.id === '1');
    const event2Occurrences = occurrences.filter(o => o.id === '2');
    expect(event1Occurrences.length).toBeGreaterThan(0);
    expect(event2Occurrences.length).toBeGreaterThan(0);
  });

  it('should preserve all event properties in occurrences', () => {
    const events = [{
      id: 'test-id',
      title: 'Test Event',
      description: 'Test Description',
      hebrew_year: 5784,
      hebrew_month: 7, // Tishrei
      hebrew_day: 15,
      recurrence_rule: 'yearly',
    }];

    const start = new Date('2024-01-01');
    const end = new Date('2025-12-31');

    const occurrences = generateEventOccurrences(events, start, end);

    expect(occurrences.length).toBeGreaterThan(0);
    const occurrence = occurrences[0];
    expect(occurrence.id).toBe('test-id');
    expect(occurrence.title).toBe('Test Event');
    expect(occurrence.description).toBe('Test Description');
    expect(occurrence.hebrew_year).toBe(5784);
    expect(occurrence.hebrew_month).toBe(7);
    expect(occurrence.hebrew_day).toBe(15);
    expect(occurrence.recurrence_rule).toBe('yearly');
    expect(occurrence.date).toBeInstanceOf(Date);
    expect(occurrence.anniversary).toBeGreaterThanOrEqual(0);
  });
});

describe('hebrewToGregorianCached', () => {
  beforeEach(() => {
    clearHebrewDateCache();
  });

  it('should return same result as non-cached version', () => {
    const day = 15;
    const month = 7; // Tishrei
    const year = 5785;

    const uncached = hebrewToGregorian(day, month, year);
    const cached = hebrewToGregorianCached(day, month, year);

    expect(cached.getTime()).toBe(uncached.getTime());
  });

  it('should use cache on subsequent calls (performance test)', () => {
    const day = 15;
    const month = 1; // Nisan
    const year = 5784;

    // First call - not cached
    const first = hebrewToGregorianCached(day, month, year);
    // Second call - should use cache
    const second = hebrewToGregorianCached(day, month, year);

    expect(second.getTime()).toBe(first.getTime());
    // Both should return the exact same object reference (cached)
    expect(second).toBe(first);
  });

  it('should handle multiple different dates', () => {
    const date1 = hebrewToGregorianCached(1, 7, 5785); // Tishrei
    const date2 = hebrewToGregorianCached(15, 1, 5785); // Nisan
    const date3 = hebrewToGregorianCached(1, 7, 5785); // Same as date1

    expect(date1.getTime()).not.toBe(date2.getTime());
    expect(date3).toBe(date1); // Should be cached
  });

  it('should clear cache when requested', () => {
    const day = 1;
    const month = 7; // Tishrei
    const year = 5785;

    const beforeClear = hebrewToGregorianCached(day, month, year);
    clearHebrewDateCache();
    const afterClear = hebrewToGregorianCached(day, month, year);

    // Values should be equal but not same reference (new object created)
    expect(afterClear.getTime()).toBe(beforeClear.getTime());
    expect(afterClear).not.toBe(beforeClear);
  });
});
