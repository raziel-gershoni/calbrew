/**
 * Internal Cron Endpoint for Checking Upcoming Dates
 * GET /api/internal/check-dates
 *
 * Called by Vercel cron job daily to check for upcoming Hebrew dates
 * and schedule webhook notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { getWebhooks, createWebhookDelivery } from '@/lib/api-postgres-utils';
import {
  scheduleWebhook,
  buildUpcomingDatePayload,
  isQStashConfigured,
} from '@/lib/qstash';
import * as SentryHelper from '@/lib/logger/sentry';

// Verify the request is from Vercel Cron or has the correct secret
function verifyInternalRequest(request: NextRequest): boolean {
  // Check for Vercel Cron header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }

  // Also allow requests from localhost in development
  const host = request.headers.get('host');
  if (host?.includes('localhost') && process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

interface UpcomingDateRecord {
  contact_id: string;
  contact_external_id: string;
  contact_name: string;
  date_id: string;
  date_type: string;
  hebrew_day: number;
  hebrew_month: number;
  hebrew_year: number;
  notify_days_before: number;
  client_id: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify the request
    if (!verifyInternalRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if QStash is configured
    if (!isQStashConfigured()) {
      console.log('QStash not configured, skipping webhook scheduling');
      return NextResponse.json({
        success: true,
        message: 'QStash not configured, no webhooks scheduled',
      });
    }

    // Import HDate for Hebrew date calculations
    const { HDate } = await import('@hebcal/core');
    const today = new Date();
    const todayHebrew = new HDate(today);
    const currentHebrewYear = todayHebrew.getFullYear();

    // Get all active clients with webhooks
    const clientsWithWebhooks = await query<{ client_id: string }>(
      `SELECT DISTINCT client_id FROM webhook_configs WHERE is_active = TRUE`,
    );

    if (clientsWithWebhooks.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active webhooks configured',
        processed: 0,
      });
    }

    let totalScheduled = 0;
    const failures: Array<{ clientId: string; error: string }> = [];

    // Process each client
    for (const { client_id: clientId } of clientsWithWebhooks.rows) {
      try {
        // Get webhooks for this client
        const webhooks = await getWebhooks(clientId);
        const activeWebhooks = webhooks.filter(
          (w) => w.is_active && w.events.includes('date.upcoming'),
        );

        if (activeWebhooks.length === 0) {
          continue;
        }

        // Get all contact dates for this client with their notify_days_before
        const datesResult = await query<UpcomingDateRecord>(
          `SELECT
            c.id as contact_id,
            c.external_id as contact_external_id,
            c.name as contact_name,
            d.id as date_id,
            d.date_type,
            d.hebrew_day,
            d.hebrew_month,
            d.hebrew_year,
            d.notify_days_before,
            d.client_id
          FROM api_contact_dates d
          JOIN api_contacts c ON d.contact_id = c.id
          WHERE d.client_id = $1`,
          [clientId],
        );

        // Group contacts by their notification date
        const notificationGroups = new Map<
          string,
          Array<{
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
          }>
        >();

        for (const record of datesResult.rows) {
          // Calculate the Hebrew date for current year and next year
          for (const year of [currentHebrewYear, currentHebrewYear + 1]) {
            try {
              const hebrewDate = new HDate(
                record.hebrew_day,
                record.hebrew_month,
                year,
              );
              const gregorianDate = hebrewDate.greg();

              // Calculate days until this date
              const timeDiff = gregorianDate.getTime() - today.getTime();
              const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

              // Check if this is the notification day (N days before)
              if (daysUntil === record.notify_days_before) {
                const key = `${clientId}-${daysUntil}`;
                const anniversary = year - record.hebrew_year;

                if (!notificationGroups.has(key)) {
                  notificationGroups.set(key, []);
                }

                notificationGroups.get(key)!.push({
                  contactId: record.contact_id,
                  externalId: record.contact_external_id,
                  name: record.contact_name,
                  dateType: record.date_type,
                  hebrewDay: record.hebrew_day,
                  hebrewMonth: record.hebrew_month,
                  hebrewYear: record.hebrew_year,
                  gregorianDate,
                  daysUntil,
                  anniversary,
                });
                break; // Found a match, no need to check next year
              }
            } catch {
              // Invalid date for this year (e.g., Adar II in non-leap year)
              continue;
            }
          }
        }

        // Schedule webhooks for each notification group
        for (const [_key, contacts] of notificationGroups) {
          if (contacts.length === 0) {
            continue;
          }

          const payload = buildUpcomingDatePayload(contacts);

          // Send to each active webhook
          for (const webhook of activeWebhooks) {
            const result = await scheduleWebhook(
              webhook.url,
              payload,
              webhook.secret,
              { retries: webhook.retry_count },
            );

            if (result.success) {
              // Record the delivery
              await createWebhookDelivery({
                webhookConfigId: webhook.id,
                clientId,
                eventType: 'date.upcoming',
                payload: payload as unknown as Record<string, unknown>,
              });
              totalScheduled++;
            } else {
              failures.push({
                clientId,
                error: `Webhook ${webhook.id}: ${result.error}`,
              });
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failures.push({ clientId, error: errorMessage });

        SentryHelper.addBreadcrumb({
          message: `Failed to process client ${clientId}`,
          category: 'cron',
          level: 'warning',
          data: { error: errorMessage },
        });
      }
    }

    // Report failures if any
    if (failures.length > 0) {
      SentryHelper.captureException(
        new Error('Some webhook schedules failed'),
        {
          tags: { operation: 'check-dates-cron' },
          extra: {
            totalClients: clientsWithWebhooks.rows.length,
            totalScheduled,
            failureCount: failures.length,
            failures,
          },
          level:
            failures.length === clientsWithWebhooks.rows.length
              ? 'error'
              : 'warning',
        },
      );
    }

    return NextResponse.json({
      success: true,
      processed: clientsWithWebhooks.rows.length,
      scheduled: totalScheduled,
      failures: failures.length,
    });
  } catch (error) {
    console.error('Check dates cron error:', error);

    SentryHelper.captureException(error, {
      tags: { endpoint: '/api/internal/check-dates', operation: 'cron' },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
