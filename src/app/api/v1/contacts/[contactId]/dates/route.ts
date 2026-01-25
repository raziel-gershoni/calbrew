/**
 * Contact Dates API Endpoints (Tier 2 - Premium)
 * GET /api/v1/contacts/[contactId]/dates - List dates for a contact
 * POST /api/v1/contacts/[contactId]/dates - Add a date to a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier2ReadMiddleware,
  withTier2WriteMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
} from '@/lib/api-middleware';
import { validateRequest } from '@/lib/validation';
import { AddContactDateSchema } from '@/lib/api-validation';
import {
  getContactById,
  getContactDates,
  addContactDate,
} from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

type RouteContext = { params: Promise<{ contactId: string }> };

/**
 * GET /api/v1/contacts/[contactId]/dates - List dates for a contact
 */
async function handleList(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { contactId } = await routeContext.params;

    // Check if contact exists
    const contact = await getContactById(contactId, context.client.client.id);
    if (!contact) {
      return apiErrorResponse('Contact not found', 'NOT_FOUND', context, 404);
    }

    const dates = await getContactDates(contactId, context.client.client.id);

    return apiSuccessResponse(
      {
        dates: dates.map((d) => ({
          id: d.id,
          type: d.date_type,
          hebrewDate: {
            day: d.hebrew_day,
            month: d.hebrew_month,
            year: d.hebrew_year,
          },
          notifyDaysBefore: d.notify_days_before,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })),
        count: dates.length,
      },
      context,
    );
  } catch (error) {
    console.error('List contact dates error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/[contactId]/dates',
        method: 'GET',
        clientId: context.client.client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to list contact dates',
      'LIST_ERROR',
      context,
      500,
    );
  }
}

/**
 * POST /api/v1/contacts/[contactId]/dates - Add a date to a contact
 */
async function handleAdd(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { contactId } = await routeContext.params;
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(AddContactDateSchema, body);
    if (!validation.success) {
      return apiErrorResponse(
        validation.error!,
        'VALIDATION_ERROR',
        context,
        400,
        { details: validation.details },
      );
    }

    const data = validation.data!;

    // Check if contact exists
    const contact = await getContactById(contactId, context.client.client.id);
    if (!contact) {
      return apiErrorResponse('Contact not found', 'NOT_FOUND', context, 404);
    }

    // Add the date
    const date = await addContactDate({
      contactId,
      clientId: context.client.client.id,
      dateType: data.type,
      hebrewDay: data.hebrewDay,
      hebrewMonth: data.hebrewMonth,
      hebrewYear: data.hebrewYear,
      notifyDaysBefore: data.notifyDaysBefore,
    });

    return apiSuccessResponse(
      {
        date: {
          id: date.id,
          type: date.date_type,
          hebrewDate: {
            day: date.hebrew_day,
            month: date.hebrew_month,
            year: date.hebrew_year,
          },
          notifyDaysBefore: date.notify_days_before,
          createdAt: date.created_at,
        },
      },
      context,
      'Date added successfully',
      201,
    );
  } catch (error) {
    console.error('Add contact date error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/[contactId]/dates',
        method: 'POST',
        clientId: context.client.client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to add contact date',
      'ADD_ERROR',
      context,
      500,
    );
  }
}

// Wrap handlers with middleware and route context
export async function GET(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2ReadMiddleware(
    (req, ctx) => handleList(req, ctx, routeContext),
    'contacts:read',
  );
  return handler(request);
}

export async function POST(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2WriteMiddleware(
    (req, ctx) => handleAdd(req, ctx, routeContext),
    'contacts:write',
  );
  return handler(request);
}
