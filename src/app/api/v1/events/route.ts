/**
 * Events API Endpoint
 * GET /api/v1/events - List user's Hebrew calendar events
 *
 * Requires events:read scope. Works with PATs and API keys (if client has user_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withEventsMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getUserId,
  getAuthId,
} from '@/lib/api-middleware';
import { getEventsByUserIdPaginated } from '@/lib/postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

async function handleListEvents(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const userId = getUserId(context);

    if (!userId) {
      return apiErrorResponse(
        'This endpoint requires a user-linked authentication method (PAT or API key with user_id)',
        'FORBIDDEN',
        context,
        403,
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { events, total } = await getEventsByUserIdPaginated(
      userId,
      limit,
      offset,
    );

    return apiSuccessResponse(
      {
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          hebrewDate: {
            year: e.hebrew_year,
            month: e.hebrew_month,
            day: e.hebrew_day,
          },
          recurrenceRule: e.recurrence_rule,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })),
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + events.length < total,
        },
      },
      context,
    );
  } catch (error) {
    console.error('List events error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/events',
        method: 'GET',
        clientId: getAuthId(context),
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to list events',
      'LIST_ERROR',
      context,
      500,
    );
  }
}

export const GET = withEventsMiddleware(handleListEvents);
