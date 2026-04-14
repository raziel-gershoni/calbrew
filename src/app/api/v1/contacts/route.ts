/**
 * Contacts API Endpoints (Tier 2 - Premium)
 * GET /api/v1/contacts - List contacts
 * POST /api/v1/contacts - Create a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier2ReadMiddleware,
  withTier2WriteMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getClientAuth,
} from '@/lib/api-middleware';
import { validateRequest } from '@/lib/validation';
import { CreateContactSchema } from '@/lib/api-validation';
import {
  listContacts,
  createContactWithDates,
  getContactByExternalId,
} from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

/**
 * GET /api/v1/contacts - List contacts
 */
async function handleList(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { contacts, total } = await listContacts(
      getClientAuth(context).client.id,
      limit,
      offset,
    );

    return apiSuccessResponse(
      {
        contacts: contacts.map((c) => ({
          id: c.id,
          externalId: c.external_id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          metadata: c.metadata,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + contacts.length < total,
        },
      },
      context,
    );
  } catch (error) {
    console.error('List contacts error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts',
        method: 'GET',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to list contacts',
      'LIST_ERROR',
      context,
      500,
    );
  }
}

/**
 * POST /api/v1/contacts - Create a contact
 */
async function handleCreate(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(CreateContactSchema, body);
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

    // Check if external ID already exists
    const existing = await getContactByExternalId(
      data.externalId,
      getClientAuth(context).client.id,
    );
    if (existing) {
      return apiErrorResponse(
        `Contact with external ID '${data.externalId}' already exists`,
        'DUPLICATE_ERROR',
        context,
        409,
      );
    }

    // Create contact with dates
    const { contact, dates } = await createContactWithDates({
      clientId: getClientAuth(context).client.id,
      externalId: data.externalId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      metadata: data.metadata,
      dates: data.dates.map((d) => ({
        type: d.type,
        hebrewDay: d.hebrewDay,
        hebrewMonth: d.hebrewMonth,
        hebrewYear: d.hebrewYear,
        notifyDaysBefore: d.notifyDaysBefore,
      })),
    });

    return apiSuccessResponse(
      {
        contact: {
          id: contact.id,
          externalId: contact.external_id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          metadata: contact.metadata,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
        },
        dates: dates.map((d) => ({
          id: d.id,
          type: d.date_type,
          hebrewDate: {
            day: d.hebrew_day,
            month: d.hebrew_month,
            year: d.hebrew_year,
          },
          notifyDaysBefore: d.notify_days_before,
        })),
      },
      context,
      'Contact created successfully',
      201,
    );
  } catch (error) {
    console.error('Create contact error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts',
        method: 'POST',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to create contact',
      'CREATE_ERROR',
      context,
      500,
    );
  }
}

export const GET = withTier2ReadMiddleware(handleList, 'contacts:read');
export const POST = withTier2WriteMiddleware(handleCreate, 'contacts:write');
