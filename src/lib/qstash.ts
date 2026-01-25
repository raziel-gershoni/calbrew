/**
 * QStash client wrapper for webhook delivery
 * Uses Upstash QStash for serverless-compatible webhook scheduling
 */

import { Client, Receiver } from '@upstash/qstash';
import { createHmac } from 'crypto';
import * as SentryHelper from './logger/sentry';

// ==================== Types ====================

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    contacts: Array<{
      contactId: string;
      externalId: string;
      name: string;
      date: {
        type: string;
        hebrewDate: {
          day: number;
          month: number;
          year: number;
        };
        gregorianDate: string;
        daysUntil: number;
        anniversary: number;
      };
    }>;
  };
}

export interface ScheduleResult {
  messageId: string;
  success: boolean;
  error?: string;
}

// ==================== QStash Client ====================

let qstashClient: Client | null = null;
let qstashReceiver: Receiver | null = null;

/**
 * Get or create the QStash client
 */
function getQStashClient(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error('QSTASH_TOKEN environment variable is not set');
    }
    qstashClient = new Client({ token });
  }
  return qstashClient;
}

/**
 * Get or create the QStash receiver for signature verification
 */
function getQStashReceiver(): Receiver {
  if (!qstashReceiver) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentSigningKey || !nextSigningKey) {
      throw new Error(
        'QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY must be set',
      );
    }

    qstashReceiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });
  }
  return qstashReceiver;
}

// ==================== Webhook Signature ====================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify HMAC-SHA256 signature from incoming webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return signature === `sha256=${expectedSignature}`;
}

// ==================== QStash Operations ====================

/**
 * Schedule a webhook delivery via QStash
 */
export async function scheduleWebhook(
  url: string,
  payload: WebhookPayload,
  webhookSecret: string,
  options?: {
    delay?: number; // Delay in seconds
    retries?: number;
  },
): Promise<ScheduleResult> {
  try {
    const client = getQStashClient();
    const payloadStr = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadStr, webhookSecret);
    const timestamp = new Date().toISOString();

    const result = await client.publishJSON({
      url,
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Calbrew-Signature': `sha256=${signature}`,
        'X-Calbrew-Timestamp': timestamp,
      },
      delay: options?.delay,
      retries: options?.retries ?? 3,
    });

    return {
      messageId: result.messageId,
      success: true,
    };
  } catch (error) {
    console.error('Failed to schedule webhook:', error);

    SentryHelper.captureException(error, {
      tags: {
        module: 'qstash',
        operation: 'schedule-webhook',
      },
      extra: { url },
      level: 'error',
    });

    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Schedule a webhook for a specific date (absolute time)
 */
export async function scheduleWebhookAt(
  url: string,
  payload: WebhookPayload,
  webhookSecret: string,
  deliverAt: Date,
  retries?: number,
): Promise<ScheduleResult> {
  try {
    const client = getQStashClient();
    const payloadStr = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadStr, webhookSecret);
    const timestamp = new Date().toISOString();

    const result = await client.publishJSON({
      url,
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Calbrew-Signature': `sha256=${signature}`,
        'X-Calbrew-Timestamp': timestamp,
      },
      notBefore: Math.floor(deliverAt.getTime() / 1000),
      retries: retries ?? 3,
    });

    return {
      messageId: result.messageId,
      success: true,
    };
  } catch (error) {
    console.error('Failed to schedule webhook at specific time:', error);

    SentryHelper.captureException(error, {
      tags: {
        module: 'qstash',
        operation: 'schedule-webhook-at',
      },
      extra: { url, deliverAt: deliverAt.toISOString() },
      level: 'error',
    });

    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify that an incoming request is from QStash
 */
export async function verifyQStashSignature(
  signature: string,
  body: string,
  url?: string,
): Promise<boolean> {
  try {
    const receiver = getQStashReceiver();
    const isValid = await receiver.verify({
      signature,
      body,
      url,
    });
    return isValid;
  } catch (error) {
    console.error('Failed to verify QStash signature:', error);
    return false;
  }
}

/**
 * Check if QStash is configured
 */
export function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  );
}

// ==================== Webhook Payload Builders ====================

/**
 * Build a date.upcoming webhook payload
 */
export function buildUpcomingDatePayload(
  contacts: Array<{
    contactId: string;
    externalId: string;
    name: string;
    dateType: string;
    hebrewDay: number;
    hebrewMonth: number;
    hebrewYear: number;
    gregorianDate: Date;
    daysUntil: number;
    anniversary: number;
  }>,
): WebhookPayload {
  return {
    event: 'date.upcoming',
    timestamp: new Date().toISOString(),
    data: {
      contacts: contacts.map((c) => ({
        contactId: c.contactId,
        externalId: c.externalId,
        name: c.name,
        date: {
          type: c.dateType,
          hebrewDate: {
            day: c.hebrewDay,
            month: c.hebrewMonth,
            year: c.hebrewYear,
          },
          gregorianDate: `${c.gregorianDate.getFullYear()}-${String(c.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(c.gregorianDate.getDate()).padStart(2, '0')}`,
          daysUntil: c.daysUntil,
          anniversary: c.anniversary,
        },
      })),
    },
  };
}
