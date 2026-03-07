/**
 * Pre-filled example values for each API endpoint form.
 * Values match the Zod schemas in src/lib/api-validation.ts.
 */

import type {
  ConvertDatesRequest,
  OccurrencesRequest,
  CreateContact,
  CreateWebhook,
} from '@/lib/api-validation';

// ==================== Tier 1: Date Utilities ====================

export const convertDatesDefault: ConvertDatesRequest = {
  conversions: [
    {
      from: 'gregorian',
      to: 'hebrew',
      date: '2026-03-15',
    },
    {
      from: 'hebrew',
      to: 'gregorian',
      date: { day: 15, month: 7, year: 5786 },
    },
  ],
};

export const occurrencesDefault: OccurrencesRequest = {
  dates: [
    {
      hebrewDay: 15,
      hebrewMonth: 1,
      hebrewYear: 5786,
      title: 'Birthday',
    },
  ],
  startDate: '2026-01-01',
  endDate: '2028-12-31',
};

export const holidaysDefaults = {
  startDate: '2026-03-01',
  endDate: '2026-04-30',
  types: ['majorHolidays', 'minorHolidays'] as const,
  language: 'en' as const,
};

// ==================== Tier 2: Contacts ====================

export const createContactDefault: CreateContact = {
  externalId: 'demo-contact-001',
  name: 'David Cohen',
  email: 'david@example.com',
  phone: '+972-50-123-4567',
  metadata: { source: 'api-demo' },
  dates: [
    {
      type: 'birthday',
      hebrewDay: 15,
      hebrewMonth: 7,
      hebrewYear: 5760,
      notifyDaysBefore: 7,
    },
  ],
};

export const upcomingDatesDefaults = {
  daysAhead: '30',
  limit: '10',
  offset: '0',
};

// ==================== Tier 2: Webhooks ====================

export const createWebhookDefault: CreateWebhook = {
  url: 'https://example.com/webhook',
  events: ['date.upcoming'],
  retryCount: 3,
  timeoutMs: 30000,
};
