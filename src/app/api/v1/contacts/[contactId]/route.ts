/**
 * Single Contact API Endpoints (Tier 2 - Premium)
 * GET /api/v1/contacts/[contactId] - Get a contact
 * PATCH /api/v1/contacts/[contactId] - Update a contact
 * DELETE /api/v1/contacts/[contactId] - Delete a contact
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
import { UpdateContactSchema } from '@/lib/api-validation';
import {
  getContactById,
  updateContact,
  deleteContact,
  getContactDates,
} from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

type RouteContext = { params: Promise<{ contactId: string }> };

/**
 * GET /api/v1/contacts/[contactId] - Get a contact with its dates
 */
async function handleGet(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { contactId } = await routeContext.params;

    const contact = await getContactById(
      contactId,
      getClientAuth(context).client.id,
    );
    if (!contact) {
      return apiErrorResponse('Contact not found', 'NOT_FOUND', context, 404);
    }

    const dates = await getContactDates(
      contactId,
      getClientAuth(context).client.id,
    );

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
          createdAt: d.created_at,
        })),
      },
      context,
    );
  } catch (error) {
    console.error('Get contact error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/[contactId]',
        method: 'GET',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse('Failed to get contact', 'GET_ERROR', context, 500);
  }
}

/**
 * PATCH /api/v1/contacts/[contactId] - Update a contact
 */
async function handleUpdate(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { contactId } = await routeContext.params;
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(UpdateContactSchema, body);
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
    const existing = await getContactById(
      contactId,
      getClientAuth(context).client.id,
    );
    if (!existing) {
      return apiErrorResponse('Contact not found', 'NOT_FOUND', context, 404);
    }

    // Update contact
    const contact = await updateContact(
      contactId,
      getClientAuth(context).client.id,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        metadata: data.metadata,
      },
    );

    if (!contact) {
      return apiErrorResponse(
        'Failed to update contact',
        'UPDATE_ERROR',
        context,
        500,
      );
    }

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
      },
      context,
      'Contact updated successfully',
    );
  } catch (error) {
    console.error('Update contact error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/[contactId]',
        method: 'PATCH',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to update contact',
      'UPDATE_ERROR',
      context,
      500,
    );
  }
}

/**
 * DELETE /api/v1/contacts/[contactId] - Delete a contact
 */
async function handleDelete(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { contactId } = await routeContext.params;

    // Check if contact exists
    const existing = await getContactById(
      contactId,
      getClientAuth(context).client.id,
    );
    if (!existing) {
      return apiErrorResponse('Contact not found', 'NOT_FOUND', context, 404);
    }

    // Delete contact (cascades to dates)
    const deleted = await deleteContact(
      contactId,
      getClientAuth(context).client.id,
    );
    if (!deleted) {
      return apiErrorResponse(
        'Failed to delete contact',
        'DELETE_ERROR',
        context,
        500,
      );
    }

    return apiSuccessResponse(
      { deleted: true },
      context,
      'Contact deleted successfully',
    );
  } catch (error) {
    console.error('Delete contact error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/contacts/[contactId]',
        method: 'DELETE',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to delete contact',
      'DELETE_ERROR',
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
    (req, ctx) => handleGet(req, ctx, routeContext),
    'contacts:read',
  );
  return handler(request);
}

export async function PATCH(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2WriteMiddleware(
    (req, ctx) => handleUpdate(req, ctx, routeContext),
    'contacts:write',
  );
  return handler(request);
}

export async function DELETE(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2WriteMiddleware(
    (req, ctx) => handleDelete(req, ctx, routeContext),
    'contacts:write',
  );
  return handler(request);
}
