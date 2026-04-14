/**
 * Webhook Test Endpoint (Tier 2 - Premium)
 * POST /api/v1/webhooks/test - Send a test webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withTier2WriteMiddleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getClientAuth,
} from '@/lib/api-middleware';
import { getWebhookById } from '@/lib/api-postgres-utils';
import {
  scheduleWebhook,
  buildUpcomingDatePayload,
  isQStashConfigured,
} from '@/lib/qstash';
import * as SentryHelper from '@/lib/logger/sentry';

/**
 * POST /api/v1/webhooks/test - Send a test webhook
 *
 * Body:
 * - webhookId: ID of the webhook to test
 */
async function handleTest(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { webhookId } = body;

    if (!webhookId) {
      return apiErrorResponse(
        'webhookId is required',
        'VALIDATION_ERROR',
        context,
        400,
      );
    }

    // Check if QStash is configured
    if (!isQStashConfigured()) {
      return apiErrorResponse(
        'Webhook delivery is not configured. QStash environment variables are missing.',
        'CONFIGURATION_ERROR',
        context,
        503,
      );
    }

    // Get webhook
    const webhook = await getWebhookById(
      webhookId,
      getClientAuth(context).client.id,
    );
    if (!webhook) {
      return apiErrorResponse('Webhook not found', 'NOT_FOUND', context, 404);
    }

    if (!webhook.is_active) {
      return apiErrorResponse(
        'Webhook is not active',
        'WEBHOOK_INACTIVE',
        context,
        400,
      );
    }

    // Build test payload
    const testPayload = buildUpcomingDatePayload([
      {
        contactId: 'test-contact-id',
        externalId: 'test-external-id',
        name: 'Test Contact',
        dateType: 'birthday',
        hebrewDay: 15,
        hebrewMonth: 7, // Tishrei
        hebrewYear: 5785,
        gregorianDate: new Date(),
        daysUntil: 7,
        anniversary: 30,
      },
    ]);

    // Schedule webhook delivery
    const result = await scheduleWebhook(
      webhook.url,
      testPayload,
      webhook.secret,
      { retries: 0 }, // No retries for test
    );

    if (!result.success) {
      return apiErrorResponse(
        `Failed to send test webhook: ${result.error}`,
        'DELIVERY_ERROR',
        context,
        500,
      );
    }

    return apiSuccessResponse(
      {
        success: true,
        messageId: result.messageId,
        webhookUrl: webhook.url,
        payload: testPayload,
      },
      context,
      'Test webhook scheduled successfully',
    );
  } catch (error) {
    console.error('Test webhook error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/webhooks/test',
        method: 'POST',
        clientId: getClientAuth(context).client.id,
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to send test webhook',
      'TEST_ERROR',
      context,
      500,
    );
  }
}

export const POST = withTier2WriteMiddleware(handleTest, 'webhooks:write');
