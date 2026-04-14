/**
 * Holidays API Endpoint (Tier 1)
 * GET /api/v1/dates/holidays
 *
 * Returns Hebrew holidays and significant dates within a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier1Middleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getAuthId,
} from '@/lib/api-middleware';
import { getHebrewEventsForCalendarRange } from '@/utils/hebrewDateUtils';
import { HebrewEventPreferences } from '@/types/hebrewEventPreferences';
import * as SentryHelper from '@/lib/logger/sentry';

interface HolidayResult {
  id: string;
  title: string;
  gregorianDate: string;
  hebrewDate: {
    day: number;
    month: number;
    year: number;
    formatted: string;
  };
  type: string;
  flags: number;
}

async function handleHolidays(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const typesParam = searchParams.get('types');
    const language = (searchParams.get('language') as 'en' | 'he') || 'en';

    // Validate required parameters
    if (!startDate || !endDate) {
      return apiErrorResponse(
        'startDate and endDate query parameters are required',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return apiErrorResponse(
        'Dates must be in YYYY-MM-DD format',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    // Parse dates
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const rangeStart = new Date(startYear, startMonth - 1, startDay);
    const rangeEnd = new Date(endYear, endMonth - 1, endDay);

    // Validate date range
    if (rangeStart > rangeEnd) {
      return apiErrorResponse(
        'Start date must be before end date',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    // Limit range to 1 year for performance
    const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
    if (rangeEnd.getTime() - rangeStart.getTime() > maxRangeMs) {
      return apiErrorResponse(
        'Date range cannot exceed 1 year',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    // Parse types parameter into preferences
    const types = typesParam ? typesParam.split(',') : null;
    const validTypes = [
      'majorHolidays',
      'minorHolidays',
      'fastDays',
      'roshChodesh',
      'modernHolidays',
      'torahReadings',
      'specialShabbat',
      'omerCount',
    ];

    // Validate types
    if (types) {
      const invalidTypes = types.filter((t) => !validTypes.includes(t));
      if (invalidTypes.length > 0) {
        return apiErrorResponse(
          `Invalid types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`,
          'VALIDATION_ERROR',
          context,
          400,
        );
      }
    }

    // Build preferences object
    const preferences: HebrewEventPreferences = types
      ? {
          majorHolidays: types.includes('majorHolidays'),
          minorHolidays: types.includes('minorHolidays'),
          fastDays: types.includes('fastDays'),
          roshChodesh: types.includes('roshChodesh'),
          modernHolidays: types.includes('modernHolidays'),
          torahReadings: types.includes('torahReadings'),
          specialShabbat: types.includes('specialShabbat'),
          omerCount: types.includes('omerCount'),
          // Daily learning disabled for API
          dafYomi: false,
          mishnaYomi: false,
          yerushalmiYomi: false,
          nachYomi: false,
        }
      : {
          // Default: all main holiday types enabled
          majorHolidays: true,
          minorHolidays: true,
          fastDays: true,
          roshChodesh: true,
          modernHolidays: false,
          torahReadings: false,
          specialShabbat: false,
          omerCount: false,
          dafYomi: false,
          mishnaYomi: false,
          yerushalmiYomi: false,
          nachYomi: false,
        };

    // Get Hebrew events
    const events = getHebrewEventsForCalendarRange(
      rangeStart,
      rangeEnd,
      language,
      preferences,
    );

    // Transform to API response format
    const holidays: HolidayResult[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      gregorianDate: `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`,
      hebrewDate: {
        day: event.hebrewDate.getDate(),
        month: event.hebrewDate.getMonth(),
        year: event.hebrewDate.getFullYear(),
        formatted: event.hebrewDate.toString(),
      },
      type: event.type,
      flags: event.flags,
    }));

    return apiSuccessResponse(
      {
        holidays,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        filters: {
          types:
            types ||
            Object.keys(preferences).filter(
              (k) => preferences[k as keyof HebrewEventPreferences],
            ),
          language,
        },
        count: holidays.length,
      },
      context,
    );
  } catch (error) {
    console.error('Holidays fetch error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/dates/holidays',
        method: 'GET',
        clientId: getAuthId(context),
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to fetch holidays',
      'FETCH_ERROR',
      context,
      500,
    );
  }
}

export const GET = withTier1Middleware(handleHolidays);
