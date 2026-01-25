import { describe, it, expect } from 'vitest';
import { getRateLimitHeaders, RateLimitResult } from './api-rate-limit';

describe('api-rate-limit', () => {
  describe('getRateLimitHeaders', () => {
    it('should return minute limit when minute is more restrictive', () => {
      const minuteLimit: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 10, // 16.7% remaining
        resetAt: new Date('2025-01-23T12:01:00Z'),
        windowType: 'minute',
      };

      const dayLimit: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 5000, // 50% remaining
        resetAt: new Date('2025-01-24T00:00:00Z'),
        windowType: 'day',
      };

      const headers = getRateLimitHeaders(minuteLimit, dayLimit);

      expect(headers['X-RateLimit-Limit']).toBe('60');
      expect(headers['X-RateLimit-Remaining']).toBe('10');
      expect(headers['X-RateLimit-Reset']).toBe(
        Math.floor(minuteLimit.resetAt.getTime() / 1000).toString(),
      );
    });

    it('should return day limit when day is more restrictive', () => {
      const minuteLimit: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 50, // 83% remaining
        resetAt: new Date('2025-01-23T12:01:00Z'),
        windowType: 'minute',
      };

      const dayLimit: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 100, // 1% remaining
        resetAt: new Date('2025-01-24T00:00:00Z'),
        windowType: 'day',
      };

      const headers = getRateLimitHeaders(minuteLimit, dayLimit);

      expect(headers['X-RateLimit-Limit']).toBe('10000');
      expect(headers['X-RateLimit-Remaining']).toBe('100');
      expect(headers['X-RateLimit-Reset']).toBe(
        Math.floor(dayLimit.resetAt.getTime() / 1000).toString(),
      );
    });

    it('should return minute limit when both have same percentage', () => {
      const minuteLimit: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 30, // 50% remaining
        resetAt: new Date('2025-01-23T12:01:00Z'),
        windowType: 'minute',
      };

      const dayLimit: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 5000, // 50% remaining
        resetAt: new Date('2025-01-24T00:00:00Z'),
        windowType: 'day',
      };

      const headers = getRateLimitHeaders(minuteLimit, dayLimit);

      // When equal, should prefer minute (first checked)
      expect(headers['X-RateLimit-Limit']).toBe('60');
    });

    it('should handle zero remaining', () => {
      const minuteLimit: RateLimitResult = {
        allowed: false,
        limit: 60,
        remaining: 0,
        resetAt: new Date('2025-01-23T12:01:00Z'),
        windowType: 'minute',
      };

      const dayLimit: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 5000,
        resetAt: new Date('2025-01-24T00:00:00Z'),
        windowType: 'day',
      };

      const headers = getRateLimitHeaders(minuteLimit, dayLimit);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });

    it('should format reset time as Unix timestamp', () => {
      const resetTime = new Date('2025-01-23T12:00:00Z');
      const minuteLimit: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 30,
        resetAt: resetTime,
        windowType: 'minute',
      };

      const dayLimit: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 9000,
        resetAt: new Date('2025-01-24T00:00:00Z'),
        windowType: 'day',
      };

      const headers = getRateLimitHeaders(minuteLimit, dayLimit);

      const expectedTimestamp = Math.floor(resetTime.getTime() / 1000);
      expect(headers['X-RateLimit-Reset']).toBe(expectedTimestamp.toString());
    });
  });

  describe('RateLimitResult type', () => {
    it('should support minute window type', () => {
      const result: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: new Date(),
        windowType: 'minute',
      };
      expect(result.windowType).toBe('minute');
    });

    it('should support day window type', () => {
      const result: RateLimitResult = {
        allowed: true,
        limit: 10000,
        remaining: 9999,
        resetAt: new Date(),
        windowType: 'day',
      };
      expect(result.windowType).toBe('day');
    });
  });
});
