/**
 * Rate limiting library for third-party API services
 * Implements sliding window rate limiting with PostgreSQL
 */

import { query } from './postgres';
import { ApiClient } from './api-auth';
import * as SentryHelper from './logger/sentry';

// ==================== Types ====================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  windowType: 'minute' | 'day';
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

// ==================== Rate Limit Checking ====================

/**
 * Get the start of the current time window
 */
function getWindowStart(windowType: 'minute' | 'day'): Date {
  const now = new Date();

  if (windowType === 'minute') {
    // Round down to the start of the current minute
    now.setSeconds(0, 0);
  } else {
    // Round down to the start of the current day (UTC)
    now.setUTCHours(0, 0, 0, 0);
  }

  return now;
}

/**
 * Get the reset time for the current window
 */
function getWindowReset(windowType: 'minute' | 'day'): Date {
  const now = new Date();

  if (windowType === 'minute') {
    // Next minute
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);
  } else {
    // Next day (UTC)
    now.setUTCHours(0, 0, 0, 0);
    now.setUTCDate(now.getUTCDate() + 1);
  }

  return now;
}

/**
 * Check and increment rate limit for a client
 * Returns whether the request is allowed and remaining quota
 */
export async function checkRateLimit(
  client: ApiClient,
  windowType: 'minute' | 'day',
): Promise<RateLimitResult> {
  const limit =
    windowType === 'minute'
      ? client.rate_limit_per_minute
      : client.rate_limit_per_day;

  const windowStart = getWindowStart(windowType);
  const resetAt = getWindowReset(windowType);

  try {
    // Use UPSERT to atomically increment the counter
    const result = await query<{ request_count: number }>(
      `INSERT INTO api_rate_limits (client_id, window_start, window_type, request_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (client_id, pat_id, window_start, window_type)
       DO UPDATE SET request_count = api_rate_limits.request_count + 1
       RETURNING request_count`,
      [client.id, windowStart.toISOString(), windowType],
    );

    const currentCount = result.rows[0]?.request_count || 1;
    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount <= limit;

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      windowType,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-rate-limit', operation: 'check-rate-limit' },
      extra: { clientId: client.id, windowType },
      level: 'error',
    });

    // On error, allow the request but log it
    // This prevents rate limiting errors from blocking legitimate requests
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      windowType,
    };
  }
}

// ==================== PAT Rate Limiting ====================

const PAT_RATE_LIMIT_PER_MINUTE = 60;
const PAT_RATE_LIMIT_PER_DAY = 10000;

/**
 * Check and increment rate limit for a PAT
 */
export async function checkRateLimitForPAT(
  patId: string,
  windowType: 'minute' | 'day',
): Promise<RateLimitResult> {
  const limit =
    windowType === 'minute'
      ? PAT_RATE_LIMIT_PER_MINUTE
      : PAT_RATE_LIMIT_PER_DAY;

  const windowStart = getWindowStart(windowType);
  const resetAt = getWindowReset(windowType);

  try {
    const result = await query<{ request_count: number }>(
      `INSERT INTO api_rate_limits (pat_id, window_start, window_type, request_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (client_id, pat_id, window_start, window_type)
       DO UPDATE SET request_count = api_rate_limits.request_count + 1
       RETURNING request_count`,
      [patId, windowStart.toISOString(), windowType],
    );

    const currentCount = result.rows[0]?.request_count || 1;
    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount <= limit;

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      windowType,
    };
  } catch (error) {
    console.error('Error checking PAT rate limit:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-rate-limit', operation: 'check-pat-rate-limit' },
      extra: { patId, windowType },
      level: 'error',
    });

    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      windowType,
    };
  }
}

/**
 * Check both minute and day rate limits for a PAT
 */
export async function checkAllRateLimitsForPAT(patId: string): Promise<{
  allowed: boolean;
  minuteLimit: RateLimitResult;
  dayLimit: RateLimitResult;
  restrictedBy: 'minute' | 'day' | null;
}> {
  const [minuteLimit, dayLimit] = await Promise.all([
    checkRateLimitForPAT(patId, 'minute'),
    checkRateLimitForPAT(patId, 'day'),
  ]);

  let restrictedBy: 'minute' | 'day' | null = null;
  if (!minuteLimit.allowed) {
    restrictedBy = 'minute';
  } else if (!dayLimit.allowed) {
    restrictedBy = 'day';
  }

  return {
    allowed: minuteLimit.allowed && dayLimit.allowed,
    minuteLimit,
    dayLimit,
    restrictedBy,
  };
}

/**
 * Check both minute and day rate limits
 * Returns the most restrictive result
 */
export async function checkAllRateLimits(client: ApiClient): Promise<{
  allowed: boolean;
  minuteLimit: RateLimitResult;
  dayLimit: RateLimitResult;
  restrictedBy: 'minute' | 'day' | null;
}> {
  const [minuteLimit, dayLimit] = await Promise.all([
    checkRateLimit(client, 'minute'),
    checkRateLimit(client, 'day'),
  ]);

  // Determine which limit is more restrictive
  let restrictedBy: 'minute' | 'day' | null = null;
  if (!minuteLimit.allowed) {
    restrictedBy = 'minute';
  } else if (!dayLimit.allowed) {
    restrictedBy = 'day';
  }

  return {
    allowed: minuteLimit.allowed && dayLimit.allowed,
    minuteLimit,
    dayLimit,
    restrictedBy,
  };
}

// ==================== Response Headers ====================

/**
 * Generate rate limit headers for the response
 * Uses the most restrictive limit
 */
export function getRateLimitHeaders(
  minuteLimit: RateLimitResult,
  dayLimit: RateLimitResult,
): RateLimitHeaders {
  // Use minute limit if it's more restrictive (lower remaining percentage)
  const minutePercent = minuteLimit.remaining / minuteLimit.limit;
  const dayPercent = dayLimit.remaining / dayLimit.limit;

  const useMinute = minutePercent <= dayPercent;
  const primary = useMinute ? minuteLimit : dayLimit;

  return {
    'X-RateLimit-Limit': primary.limit.toString(),
    'X-RateLimit-Remaining': primary.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(
      primary.resetAt.getTime() / 1000,
    ).toString(),
  };
}

// ==================== Cleanup ====================

/**
 * Clean up old rate limit records
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldRateLimits(): Promise<number> {
  try {
    // Delete records older than 2 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);

    const result = await query(
      'DELETE FROM api_rate_limits WHERE window_start < $1',
      [cutoff.toISOString()],
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-rate-limit', operation: 'cleanup' },
      level: 'warning',
    });
    return 0;
  }
}

// ==================== Query Usage ====================

/**
 * Get current usage statistics for a client
 */
export async function getClientUsage(clientId: string): Promise<{
  minuteUsage: number;
  dayUsage: number;
} | null> {
  try {
    const minuteStart = getWindowStart('minute');
    const dayStart = getWindowStart('day');

    const result = await query<{
      window_type: string;
      request_count: number;
    }>(
      `SELECT window_type, request_count
       FROM api_rate_limits
       WHERE client_id = $1
         AND ((window_type = 'minute' AND window_start = $2)
           OR (window_type = 'day' AND window_start = $3))`,
      [clientId, minuteStart.toISOString(), dayStart.toISOString()],
    );

    let minuteUsage = 0;
    let dayUsage = 0;

    for (const row of result.rows) {
      if (row.window_type === 'minute') {
        minuteUsage = row.request_count;
      } else if (row.window_type === 'day') {
        dayUsage = row.request_count;
      }
    }

    return { minuteUsage, dayUsage };
  } catch (error) {
    console.error('Error getting client usage:', error);
    return null;
  }
}
