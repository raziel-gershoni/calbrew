/**
 * Date Occurrences API Endpoint (Tier 1)
 * POST /api/v1/dates/occurrences
 *
 * Generates Gregorian date occurrences for Hebrew dates within a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier1Middleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getAuthId,
} from '@/lib/api-middleware';
import { validateRequest } from '@/lib/validation';
import { OccurrencesRequestSchema } from '@/lib/api-validation';
import {
  generateEventOccurrences,
  calculateAnniversary,
} from '@/utils/hebrewDateUtils';
import * as SentryHelper from '@/lib/logger/sentry';

interface OccurrenceResult {
  hebrewDate: {
    day: number;
    month: number;
    year: number;
  };
  title?: string;
  occurrences: Array<{
    gregorianDate: string;
    hebrewYear: number;
    anniversary: number;
  }>;
}

async function handleOccurrences(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(OccurrencesRequestSchema, body);
    if (!validation.success) {
      return apiErrorResponse(
        validation.error!,
        'VALIDATION_ERROR',
        context,
        400,
        { details: validation.details },
      );
    }

    const { dates, startDate, endDate } = validation.data!;

    // Parse date range
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

    // Limit range to 10 years for performance
    const maxRangeMs = 10 * 365 * 24 * 60 * 60 * 1000;
    if (rangeEnd.getTime() - rangeStart.getTime() > maxRangeMs) {
      return apiErrorResponse(
        'Date range cannot exceed 10 years',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    const results: OccurrenceResult[] = [];

    for (const date of dates) {
      try {
        // Create a mock event object for generateEventOccurrences
        const mockEvent = {
          id: `temp-${date.hebrewMonth}-${date.hebrewDay}`,
          title: date.title || '',
          description: '',
          hebrew_year: date.hebrewYear,
          hebrew_month: date.hebrewMonth,
          hebrew_day: date.hebrewDay,
          recurrence_rule: 'yearly',
        };

        const occurrences = generateEventOccurrences(
          [mockEvent],
          rangeStart,
          rangeEnd,
        );

        results.push({
          hebrewDate: {
            day: date.hebrewDay,
            month: date.hebrewMonth,
            year: date.hebrewYear,
          },
          title: date.title,
          occurrences: occurrences.map((occ) => ({
            gregorianDate: `${occ.date.getFullYear()}-${String(occ.date.getMonth() + 1).padStart(2, '0')}-${String(occ.date.getDate()).padStart(2, '0')}`,
            hebrewYear:
              date.hebrewYear +
              calculateAnniversary(
                occ.date.getFullYear(),
                date.hebrewYear - 3760,
              ), // Approximate Hebrew year
            anniversary: occ.anniversary || 0,
          })),
        });
      } catch (dateError) {
        SentryHelper.addBreadcrumb({
          message: 'Failed to generate occurrences for date',
          category: 'occurrences',
          level: 'warning',
          data: {
            date,
            error:
              dateError instanceof Error
                ? dateError.message
                : String(dateError),
          },
        });

        // Add empty result for failed date
        results.push({
          hebrewDate: {
            day: date.hebrewDay,
            month: date.hebrewMonth,
            year: date.hebrewYear,
          },
          title: date.title,
          occurrences: [],
        });
      }
    }

    // Calculate total occurrences
    const totalOccurrences = results.reduce(
      (sum, r) => sum + r.occurrences.length,
      0,
    );

    return apiSuccessResponse(
      {
        dates: results,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        summary: {
          totalDates: dates.length,
          totalOccurrences,
        },
      },
      context,
    );
  } catch (error) {
    console.error('Occurrences generation error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/dates/occurrences',
        method: 'POST',
        clientId: getAuthId(context),
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to generate date occurrences',
      'GENERATION_ERROR',
      context,
      500,
    );
  }
}

export const POST = withTier1Middleware(handleOccurrences);
