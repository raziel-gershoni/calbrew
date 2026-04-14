/**
 * Webhooks API Endpoints (Tier 2 - Premium)
 * GET /api/v1/webhooks - List webhooks
 * POST /api/v1/webhooks - Create a webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  withTier2ReadMiddleware,
  withTier2WriteMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getClientAuth,
} from '@/lib/api-middleware';
import { validateRequest } from '@/lib/validation';
import { CreateWebhookSchema } from '@/lib/api-validation';
import { getWebhooks, createWebhook } from '@/lib/api-postgres-utils';
import * as SentryHelper from '@/lib/logger/sentry';

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`;
}

/**
 * GET /api/v1/webhooks - List webhooks
 */
async function handleList(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const webhooks = await getWebhooks(getClientAuth(context).client.id);

    return apiSuccessResponse(
      {
        webhooks: webhooks.map((w) => ({
          id: w.id,
          url: w.url,
          events: w.events,
          isActive: w.is_active,
          retryCount: w.retry_count,
          timeoutMs: w.timeout_ms,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
          // Don't expose the secret in list response
        })),
        count: webhooks.length,
      },
      context,
    );
  } catch (error) {
    console.error('List webhooks error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks',
        method: 'GET',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to list webhooks',
      'LIST_ERROR',
      context,
      500,
    );
  }
}

/**
 * POST /api/v1/webhooks - Create a webhook
 */
async function handleCreate(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(CreateWebhookSchema, body);
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

    // Generate webhook secret
    const secret = generateWebhookSecret();

    // Create webhook
    const webhook = await createWebhook({
      clientId: getClientAuth(context).client.id,
      url: data.url,
      secret,
      events: data.events,
      retryCount: data.retryCount,
      timeoutMs: data.timeoutMs,
    });

    // Return the secret only on creation (won't be shown again)
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
        },
        // Only returned once on creation
        secret: secret,
      },
      context,
      'Webhook created successfully. Save the secret - it will not be shown again.',
      201,
    );
  } catch (error) {
    console.error('Create webhook error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks',
        method: 'POST',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to create webhook',
      'CREATE_ERROR',
      context,
      500,
    );
  }
}

export const GET = withTier2ReadMiddleware(handleList, 'webhooks:read');
export const POST = withTier2WriteMiddleware(handleCreate, 'webhooks:write');
