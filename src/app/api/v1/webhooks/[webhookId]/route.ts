/**
 * Single Webhook API Endpoints (Tier 2 - Premium)
 * GET /api/v1/webhooks/[webhookId] - Get a webhook
 * PATCH /api/v1/webhooks/[webhookId] - Update a webhook
 * DELETE /api/v1/webhooks/[webhookId] - Delete a webhook
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
import { UpdateWebhookSchema } from '@/lib/api-validation';
import {
  getWebhookById,
  updateWebhook,
  deleteWebhook,
} from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

type RouteContext = { params: Promise<{ webhookId: string }> };

/**
 * GET /api/v1/webhooks/[webhookId] - Get a webhook
 */
async function handleGet(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { webhookId } = await routeContext.params;

    const webhook = await getWebhookById(webhookId, context.client.client.id);
    if (!webhook) {
      return apiErrorResponse('Webhook not found', 'NOT_FOUND', context, 404);
    }

    return apiSuccessResponse(
      {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.is_active,
          retryCount: webhook.retry_count,
          timeoutMs: webhook.timeout_ms,
          createdAt: webhook.created_at,
          updatedAt: webhook.updated_at,
          // Don't expose the secret
        },
      },
      context,
    );
  } catch (error) {
    console.error('Get webhook error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks/[webhookId]',
        method: 'GET',
        clientId: context.client.client.id,
      },
      level: 'error',
    });

    return apiErrorResponse('Failed to get webhook', 'GET_ERROR', context, 500);
  }
}

/**
 * PATCH /api/v1/webhooks/[webhookId] - Update a webhook
 */
async function handleUpdate(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { webhookId } = await routeContext.params;
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(UpdateWebhookSchema, body);
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

    // Check if webhook exists
    const existing = await getWebhookById(webhookId, context.client.client.id);
    if (!existing) {
      return apiErrorResponse('Webhook not found', 'NOT_FOUND', context, 404);
    }

    // Update webhook
    const webhook = await updateWebhook(webhookId, context.client.client.id, {
      url: data.url,
      events: data.events,
      isActive: data.isActive,
      retryCount: data.retryCount,
      timeoutMs: data.timeoutMs,
    });

    if (!webhook) {
      return apiErrorResponse(
        'Failed to update webhook',
        'UPDATE_ERROR',
        context,
        500,
      );
    }

    return apiSuccessResponse(
      {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.is_active,
          retryCount: webhook.retry_count,
          timeoutMs: webhook.timeout_ms,
          createdAt: webhook.created_at,
          updatedAt: webhook.updated_at,
        },
      },
      context,
      'Webhook updated successfully',
    );
  } catch (error) {
    console.error('Update webhook error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks/[webhookId]',
        method: 'PATCH',
        clientId: context.client.client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to update webhook',
      'UPDATE_ERROR',
      context,
      500,
    );
  }
}

/**
 * DELETE /api/v1/webhooks/[webhookId] - Delete a webhook
 */
async function handleDelete(
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext,
): Promise<NextResponse> {
  try {
    const { webhookId } = await routeContext.params;

    // Check if webhook exists
    const existing = await getWebhookById(webhookId, context.client.client.id);
    if (!existing) {
      return apiErrorResponse('Webhook not found', 'NOT_FOUND', context, 404);
    }

    // Delete webhook
    const deleted = await deleteWebhook(webhookId, context.client.client.id);
    if (!deleted) {
      return apiErrorResponse(
        'Failed to delete webhook',
        'DELETE_ERROR',
        context,
        500,
      );
    }

    return apiSuccessResponse(
      { deleted: true },
      context,
      'Webhook deleted successfully',
    );
  } catch (error) {
    console.error('Delete webhook error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks/[webhookId]',
        method: 'DELETE',
        clientId: context.client.client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to delete webhook',
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
    'webhooks:read',
  );
  return handler(request);
}

export async function PATCH(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2WriteMiddleware(
    (req, ctx) => handleUpdate(req, ctx, routeContext),
    'webhooks:write',
  );
  return handler(request);
}

export async function DELETE(
  request: NextRequest,
  routeContext: RouteContext,
): Promise<NextResponse> {
  const handler = withTier2WriteMiddleware(
    (req, ctx) => handleDelete(req, ctx, routeContext),
    'webhooks:write',
  );
  return handler(request);
}
