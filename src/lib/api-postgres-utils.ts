/**
 * Database utilities for API tables (contacts, webhooks, etc.)
 */

import { query, transaction } from './postgres';
import { PoolClient } from 'pg';

// ==================== Types ====================

export interface ApiContact {
  id: string;
  client_id: string;
  external_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiContactDate {
  id: string;
  contact_id: string;
  client_id: string;
  date_type: string;
  hebrew_day: number;
  hebrew_month: number;
  hebrew_year: number;
  notify_days_before: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookConfig {
  id: string;
  client_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_config_id: string;
  client_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Contact Operations ====================

/**
 * Create a new contact
 */
export async function createContact(data: {
  clientId: string;
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ApiContact> {
  const result = await query<ApiContact>(
    `INSERT INTO api_contacts (client_id, external_id, name, email, phone, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.clientId,
      data.externalId,
      data.name,
      data.email || null,
      data.phone || null,
      JSON.stringify(data.metadata || {}),
    ],
  );

  return result.rows[0];
}

/**
 * Get a contact by ID
 */
export async function getContactById(
  contactId: string,
  clientId: string,
): Promise<ApiContact | null> {
  const result = await query<ApiContact>(
    'SELECT * FROM api_contacts WHERE id = $1 AND client_id = $2',
    [contactId, clientId],
  );
  return result.rows[0] || null;
}

/**
 * Get a contact by external ID
 */
export async function getContactByExternalId(
  externalId: string,
  clientId: string,
): Promise<ApiContact | null> {
  const result = await query<ApiContact>(
    'SELECT * FROM api_contacts WHERE external_id = $1 AND client_id = $2',
    [externalId, clientId],
  );
  return result.rows[0] || null;
}

/**
 * List contacts for a client
 */
export async function listContacts(
  clientId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<{ contacts: ApiContact[]; total: number }> {
  const [contactsResult, countResult] = await Promise.all([
    query<ApiContact>(
      `SELECT * FROM api_contacts
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM api_contacts WHERE client_id = $1',
      [clientId],
    ),
  ]);

  return {
    contacts: contactsResult.rows,
    total: parseInt(countResult.rows[0]?.count || '0'),
  };
}

/**
 * Update a contact
 */
export async function updateContact(
  contactId: string,
  clientId: string,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<ApiContact | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(data.phone);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) {
    return getContactById(contactId, clientId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(contactId, clientId);

  const result = await query<ApiContact>(
    `UPDATE api_contacts
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
}

/**
 * Delete a contact
 */
export async function deleteContact(
  contactId: string,
  clientId: string,
): Promise<boolean> {
  const result = await query(
    'DELETE FROM api_contacts WHERE id = $1 AND client_id = $2',
    [contactId, clientId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ==================== Contact Date Operations ====================

/**
 * Add a date to a contact
 */
export async function addContactDate(data: {
  contactId: string;
  clientId: string;
  dateType: string;
  hebrewDay: number;
  hebrewMonth: number;
  hebrewYear: number;
  notifyDaysBefore?: number;
}): Promise<ApiContactDate> {
  const result = await query<ApiContactDate>(
    `INSERT INTO api_contact_dates
       (contact_id, client_id, date_type, hebrew_day, hebrew_month, hebrew_year, notify_days_before)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.contactId,
      data.clientId,
      data.dateType,
      data.hebrewDay,
      data.hebrewMonth,
      data.hebrewYear,
      data.notifyDaysBefore ?? 7,
    ],
  );

  return result.rows[0];
}

/**
 * Get dates for a contact
 */
export async function getContactDates(
  contactId: string,
  clientId: string,
): Promise<ApiContactDate[]> {
  const result = await query<ApiContactDate>(
    `SELECT * FROM api_contact_dates
     WHERE contact_id = $1 AND client_id = $2
     ORDER BY hebrew_month, hebrew_day`,
    [contactId, clientId],
  );
  return result.rows;
}

/**
 * Get a specific contact date by ID
 */
export async function getContactDateById(
  dateId: string,
  clientId: string,
): Promise<ApiContactDate | null> {
  const result = await query<ApiContactDate>(
    'SELECT * FROM api_contact_dates WHERE id = $1 AND client_id = $2',
    [dateId, clientId],
  );
  return result.rows[0] || null;
}

/**
 * Update a contact date
 */
export async function updateContactDate(
  dateId: string,
  clientId: string,
  data: {
    dateType?: string;
    hebrewDay?: number;
    hebrewMonth?: number;
    hebrewYear?: number;
    notifyDaysBefore?: number;
  },
): Promise<ApiContactDate | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.dateType !== undefined) {
    updates.push(`date_type = $${paramIndex++}`);
    values.push(data.dateType);
  }
  if (data.hebrewDay !== undefined) {
    updates.push(`hebrew_day = $${paramIndex++}`);
    values.push(data.hebrewDay);
  }
  if (data.hebrewMonth !== undefined) {
    updates.push(`hebrew_month = $${paramIndex++}`);
    values.push(data.hebrewMonth);
  }
  if (data.hebrewYear !== undefined) {
    updates.push(`hebrew_year = $${paramIndex++}`);
    values.push(data.hebrewYear);
  }
  if (data.notifyDaysBefore !== undefined) {
    updates.push(`notify_days_before = $${paramIndex++}`);
    values.push(data.notifyDaysBefore);
  }

  if (updates.length === 0) {
    return getContactDateById(dateId, clientId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(dateId, clientId);

  const result = await query<ApiContactDate>(
    `UPDATE api_contact_dates
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
}

/**
 * Delete a contact date
 */
export async function deleteContactDate(
  dateId: string,
  clientId: string,
): Promise<boolean> {
  const result = await query(
    'DELETE FROM api_contact_dates WHERE id = $1 AND client_id = $2',
    [dateId, clientId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Create contact with dates in a transaction
 */
export async function createContactWithDates(data: {
  clientId: string;
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
  dates: Array<{
    type: string;
    hebrewDay: number;
    hebrewMonth: number;
    hebrewYear: number;
    notifyDaysBefore?: number;
  }>;
}): Promise<{ contact: ApiContact; dates: ApiContactDate[] }> {
  return transaction(async (client: PoolClient) => {
    // Create contact
    const contactResult = await client.query<ApiContact>(
      `INSERT INTO api_contacts (client_id, external_id, name, email, phone, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.clientId,
        data.externalId,
        data.name,
        data.email || null,
        data.phone || null,
        JSON.stringify(data.metadata || {}),
      ],
    );

    const contact = contactResult.rows[0];
    const dates: ApiContactDate[] = [];

    // Create dates
    for (const date of data.dates) {
      const dateResult = await client.query<ApiContactDate>(
        `INSERT INTO api_contact_dates
           (contact_id, client_id, date_type, hebrew_day, hebrew_month, hebrew_year, notify_days_before)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          contact.id,
          data.clientId,
          date.type,
          date.hebrewDay,
          date.hebrewMonth,
          date.hebrewYear,
          date.notifyDaysBefore ?? 7,
        ],
      );
      dates.push(dateResult.rows[0]);
    }

    return { contact, dates };
  });
}

// ==================== Upcoming Dates Query ====================

export interface UpcomingDate {
  contact: ApiContact;
  date: ApiContactDate;
  gregorianDate: Date;
  daysUntil: number;
  anniversary: number;
}

/**
 * Get upcoming dates for a client within a date range
 */
export async function getUpcomingDates(
  clientId: string,
  daysAhead: number = 30,
  dateTypes?: string[],
  limit: number = 100,
  offset: number = 0,
): Promise<{ dates: UpcomingDate[]; total: number }> {
  // Import HDate here to avoid circular dependencies
  const { HDate } = await import('@hebcal/core');

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  // Get the Hebrew dates for today
  const todayHebrew = new HDate(today);

  // Build date type filter
  let typeFilter = '';
  const params: unknown[] = [clientId];
  let paramIndex = 2;

  if (dateTypes && dateTypes.length > 0) {
    typeFilter = `AND d.date_type = ANY($${paramIndex++})`;
    params.push(dateTypes);
  }

  // Query contacts with dates
  const result = await query<ApiContactDate & { contact_data: string }>(
    `SELECT d.*, row_to_json(c) as contact_data
     FROM api_contact_dates d
     JOIN api_contacts c ON d.contact_id = c.id
     WHERE d.client_id = $1 ${typeFilter}
     ORDER BY d.hebrew_month, d.hebrew_day`,
    params,
  );

  const upcomingDates: UpcomingDate[] = [];

  // For each date, calculate the next occurrence
  for (const row of result.rows) {
    const contact = JSON.parse(
      row.contact_data as unknown as string,
    ) as ApiContact;

    // Calculate the Hebrew date for the current year
    const currentHebrewYear = todayHebrew.getFullYear();

    // Try this year and next year
    for (const year of [currentHebrewYear, currentHebrewYear + 1]) {
      try {
        const hebrewDate = new HDate(row.hebrew_day, row.hebrew_month, year);
        const gregorianDate = hebrewDate.greg();

        // Check if within range
        if (gregorianDate >= today && gregorianDate <= endDate) {
          const daysUntil = Math.ceil(
            (gregorianDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
          const anniversary = year - row.hebrew_year;

          upcomingDates.push({
            contact,
            date: {
              id: row.id,
              contact_id: row.contact_id,
              client_id: row.client_id,
              date_type: row.date_type,
              hebrew_day: row.hebrew_day,
              hebrew_month: row.hebrew_month,
              hebrew_year: row.hebrew_year,
              notify_days_before: row.notify_days_before,
              created_at: row.created_at,
              updated_at: row.updated_at,
            },
            gregorianDate,
            daysUntil,
            anniversary,
          });
          break; // Found occurrence in range, no need to check next year
        }
      } catch {
        // Invalid date for this year (e.g., Adar II in non-leap year)
        continue;
      }
    }
  }

  // Sort by days until
  upcomingDates.sort((a, b) => a.daysUntil - b.daysUntil);

  // Apply pagination
  const paginatedDates = upcomingDates.slice(offset, offset + limit);

  return {
    dates: paginatedDates,
    total: upcomingDates.length,
  };
}

// ==================== Webhook Operations ====================

/**
 * Create a webhook configuration
 */
export async function createWebhook(data: {
  clientId: string;
  url: string;
  secret: string;
  events?: string[];
  retryCount?: number;
  timeoutMs?: number;
}): Promise<WebhookConfig> {
  const result = await query<WebhookConfig>(
    `INSERT INTO webhook_configs (client_id, url, secret, events, retry_count, timeout_ms)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.clientId,
      data.url,
      data.secret,
      data.events || ['date.upcoming'],
      data.retryCount ?? 3,
      data.timeoutMs ?? 30000,
    ],
  );

  return result.rows[0];
}

/**
 * Get webhook configurations for a client
 */
export async function getWebhooks(clientId: string): Promise<WebhookConfig[]> {
  const result = await query<WebhookConfig>(
    'SELECT * FROM webhook_configs WHERE client_id = $1 ORDER BY created_at DESC',
    [clientId],
  );
  return result.rows;
}

/**
 * Get a webhook by ID
 */
export async function getWebhookById(
  webhookId: string,
  clientId: string,
): Promise<WebhookConfig | null> {
  const result = await query<WebhookConfig>(
    'SELECT * FROM webhook_configs WHERE id = $1 AND client_id = $2',
    [webhookId, clientId],
  );
  return result.rows[0] || null;
}

/**
 * Update a webhook configuration
 */
export async function updateWebhook(
  webhookId: string,
  clientId: string,
  data: {
    url?: string;
    events?: string[];
    isActive?: boolean;
    retryCount?: number;
    timeoutMs?: number;
  },
): Promise<WebhookConfig | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.url !== undefined) {
    updates.push(`url = $${paramIndex++}`);
    values.push(data.url);
  }
  if (data.events !== undefined) {
    updates.push(`events = $${paramIndex++}`);
    values.push(data.events);
  }
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.isActive);
  }
  if (data.retryCount !== undefined) {
    updates.push(`retry_count = $${paramIndex++}`);
    values.push(data.retryCount);
  }
  if (data.timeoutMs !== undefined) {
    updates.push(`timeout_ms = $${paramIndex++}`);
    values.push(data.timeoutMs);
  }

  if (updates.length === 0) {
    return getWebhookById(webhookId, clientId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(webhookId, clientId);

  const result = await query<WebhookConfig>(
    `UPDATE webhook_configs
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
}

/**
 * Delete a webhook configuration
 */
export async function deleteWebhook(
  webhookId: string,
  clientId: string,
): Promise<boolean> {
  const result = await query(
    'DELETE FROM webhook_configs WHERE id = $1 AND client_id = $2',
    [webhookId, clientId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Create a webhook delivery record
 */
export async function createWebhookDelivery(data: {
  webhookConfigId: string;
  clientId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<WebhookDelivery> {
  const result = await query<WebhookDelivery>(
    `INSERT INTO webhook_deliveries (webhook_config_id, client_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.webhookConfigId,
      data.clientId,
      data.eventType,
      JSON.stringify(data.payload),
    ],
  );

  return result.rows[0];
}

/**
 * Update webhook delivery status
 */
export async function updateWebhookDeliveryStatus(
  deliveryId: string,
  status: 'pending' | 'delivered' | 'failed',
  responseStatus?: number,
  responseBody?: string,
  nextRetryAt?: Date,
): Promise<void> {
  await query(
    `UPDATE webhook_deliveries
     SET status = $1, response_status = $2, response_body = $3,
         next_retry_at = $4, attempt_count = attempt_count + 1,
         last_attempt_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [
      status,
      responseStatus || null,
      responseBody || null,
      nextRetryAt?.toISOString() || null,
      deliveryId,
    ],
  );
}

/**
 * Get pending webhook deliveries for retry
 */
export async function getPendingWebhookDeliveries(
  limit: number = 100,
): Promise<
  (WebhookDelivery & { webhook_url: string; webhook_secret: string })[]
> {
  const result = await query<
    WebhookDelivery & { webhook_url: string; webhook_secret: string }
  >(
    `SELECT d.*, w.url as webhook_url, w.secret as webhook_secret
     FROM webhook_deliveries d
     JOIN webhook_configs w ON d.webhook_config_id = w.id
     WHERE d.status = 'pending'
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= CURRENT_TIMESTAMP)
       AND w.is_active = TRUE
     ORDER BY d.created_at
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}
