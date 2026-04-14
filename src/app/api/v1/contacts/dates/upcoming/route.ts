/**
 * Upcoming Dates API Endpoint (Tier 2 - Premium)
 * GET /api/v1/contacts/dates/upcoming - Query upcoming Hebrew dates
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier2ReadMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getClientAuth,
} from '@/lib/api-middleware';
import { getUpcomingDates } from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

/**
 * GET /api/v1/contacts/dates/upcoming - Query upcoming Hebrew dates
 *
 * Query Parameters:
 * - daysAhead: Number of days to look ahead (1-365, default: 30)
 * - dateTypes: Comma-separated list of date types to filter by
 * - limit: Maximum number of results (1-1000, default: 100)
 * - offset: Pagination offset (default: 0)
 */
async function handleUpcoming(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const daysAhead = Math.min(
      Math.max(parseInt(searchParams.get('daysAhead') || '30'), 1),
      365,
    );
    const dateTypesParam = searchParams.get('dateTypes');
    const dateTypes = dateTypesParam ? dateTypesParam.split(',') : undefined;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '100'), 1),
      1000,
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Get upcoming dates
    const { dates, total } = await getUpcomingDates(
      getClientAuth(context).client.id,
      daysAhead,
      dateTypes,
      limit,
      offset,
    );

    // Format response
    const formattedDates = dates.map((d) => ({
      contact: {
        id: d.contact.id,
        externalId: d.contact.external_id,
        name: d.contact.name,
        email: d.contact.email,
        phone: d.contact.phone,
      },
      date: {
        id: d.date.id,
        type: d.date.date_type,
        hebrewDate: {
          day: d.date.hebrew_day,
          month: d.date.hebrew_month,
          year: d.date.hebrew_year,
        },
        notifyDaysBefore: d.date.notify_days_before,
      },
      occurrence: {
        gregorianDate: `${d.gregorianDate.getFullYear()}-${String(d.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(d.gregorianDate.getDate()).padStart(2, '0')}`,
        daysUntil: d.daysUntil,
        anniversary: d.anniversary,
      },
    }));

    // Group by days until for convenience
    const today = dates.filter((d) => d.daysUntil === 0).length;
    const thisWeek = dates.filter(
      (d) => d.daysUntil > 0 && d.daysUntil <= 7,
    ).length;
    const thisMonth = dates.filter(
      (d) => d.daysUntil > 7 && d.daysUntil <= 30,
    ).length;

    return apiSuccessResponse(
      {
        dates: formattedDates,
        summary: {
          today,
          thisWeek,
          thisMonth,
          total,
        },
        filters: {
          daysAhead,
          dateTypes: dateTypes || 'all',
        },
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + dates.length < total,
        },
      },
      context,
    );
  } catch (error) {
    console.error('Upcoming dates error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/dates/upcoming',
        method: 'GET',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to fetch upcoming dates',
      'FETCH_ERROR',
      context,
      500,
    );
  }
}

export const GET = withTier2ReadMiddleware(handleUpcoming, 'contacts:read');
