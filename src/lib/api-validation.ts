/**
 * Zod validation schemas for third-party API endpoints
 */

import { z } from 'zod';

// ==================== Common Schemas ====================

export const HebrewDateSchema = z.object({
  day: z.number().int().min(1).max(30),
  month: z.number().int().min(1).max(14), // Account for leap years (Adar I/II)
  year: z.number().int().min(1).max(9999),
});

export const GregorianDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

// ==================== Tier 1: Date Utilities ====================

// Date conversion request
export const DateConversionSchema = z.object({
  from: z.enum(['hebrew', 'gregorian']),
  to: z.enum(['hebrew', 'gregorian']),
  date: z.union([HebrewDateSchema, GregorianDateSchema]),
});

export const ConvertDatesRequestSchema = z.object({
  conversions: z.array(DateConversionSchema).min(1).max(100),
});

// Occurrences request
export const OccurrencesRequestSchema = z.object({
  dates: z
    .array(
      z.object({
        hebrewDay: z.number().int().min(1).max(30),
        hebrewMonth: z.number().int().min(1).max(14),
        hebrewYear: z.number().int().min(1).max(9999),
        title: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
  startDate: GregorianDateSchema,
  endDate: GregorianDateSchema,
});

// Holidays request
export const HolidaysRequestSchema = z.object({
  startDate: GregorianDateSchema,
  endDate: GregorianDateSchema,
  types: z
    .array(
      z.enum([
        'majorHolidays',
        'minorHolidays',
        'fastDays',
        'roshChodesh',
        'modernHolidays',
        'torahReadings',
        'specialShabbat',
        'omerCount',
      ]),
    )
    .optional(),
  language: z.enum(['en', 'he']).optional().default('en'),
});

// ==================== Tier 2: Contact Management ====================

export const ContactDateSchema = z.object({
  type: z.string().min(1).max(100),
  hebrewDay: z.number().int().min(1).max(30),
  hebrewMonth: z.number().int().min(1).max(14),
  hebrewYear: z.number().int().min(1).max(9999),
  notifyDaysBefore: z.number().int().min(0).max(365).optional().default(7),
});

export const CreateContactSchema = z.object({
  externalId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  dates: z.array(ContactDateSchema).default([]),
});

export const UpdateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AddContactDateSchema = ContactDateSchema;

export const UpdateContactDateSchema = z.object({
  type: z.string().min(1).max(100).optional(),
  hebrewDay: z.number().int().min(1).max(30).optional(),
  hebrewMonth: z.number().int().min(1).max(14).optional(),
  hebrewYear: z.number().int().min(1).max(9999).optional(),
  notifyDaysBefore: z.number().int().min(0).max(365).optional(),
});

export const UpcomingDatesQuerySchema = z.object({
  daysAhead: z.coerce.number().int().min(1).max(365).optional().default(30),
  dateTypes: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ==================== Webhook Management ====================

export const CreateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    }),
  events: z
    .array(z.enum(['date.upcoming']))
    .min(1)
    .optional()
    .default(['date.upcoming']),
  retryCount: z.number().int().min(0).max(10).optional().default(3),
  timeoutMs: z.number().int().min(1000).max(60000).optional().default(30000),
});

export const UpdateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    })
    .optional(),
  events: z
    .array(z.enum(['date.upcoming']))
    .min(1)
    .optional(),
  isActive: z.boolean().optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

// ==================== OAuth2 ====================

export const OAuth2TokenRequestSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

// ==================== Personal Access Tokens ====================

export const PAT_AVAILABLE_SCOPES = ['events:read', 'dates:read'] as const;

export const CreatePATSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z
    .array(z.enum(PAT_AVAILABLE_SCOPES))
    .min(1)
    .optional()
    .default(['events:read']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// ==================== Admin ====================

export const CreateApiClientSchema = z.object({
  name: z.string().min(1).max(255),
  tier: z.enum(['basic', 'premium']).optional().default('basic'),
  contactEmail: z.string().email(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
  rateLimitPerDay: z.number().int().min(1).max(1000000).optional(),
});

export const UpdateApiClientSchema = z.object({
  tier: z.enum(['basic', 'premium']).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
  rateLimitPerDay: z.number().int().min(1).max(1000000).optional(),
  isActive: z.boolean().optional(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z
    .array(
      z.enum([
        'dates:read',
        'contacts:read',
        'contacts:write',
        'webhooks:read',
        'webhooks:write',
      ]),
    )
    .optional()
    .default(['dates:read']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// ==================== Type exports ====================

export type HebrewDate = z.infer<typeof HebrewDateSchema>;
export type DateConversion = z.infer<typeof DateConversionSchema>;
export type ConvertDatesRequest = z.infer<typeof ConvertDatesRequestSchema>;
export type OccurrencesRequest = z.infer<typeof OccurrencesRequestSchema>;
export type HolidaysRequest = z.infer<typeof HolidaysRequestSchema>;
export type CreateContact = z.infer<typeof CreateContactSchema>;
export type UpdateContact = z.infer<typeof UpdateContactSchema>;
export type ContactDate = z.infer<typeof ContactDateSchema>;
export type UpcomingDatesQuery = z.infer<typeof UpcomingDatesQuerySchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type OAuth2TokenRequest = z.infer<typeof OAuth2TokenRequestSchema>;
export type CreateApiClient = z.infer<typeof CreateApiClientSchema>;
export type UpdateApiClient = z.infer<typeof UpdateApiClientSchema>;
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
