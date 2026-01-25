import { describe, it, expect } from 'vitest';
import {
  HebrewDateSchema,
  GregorianDateSchema,
  ConvertDatesRequestSchema,
  OccurrencesRequestSchema,
  CreateContactSchema,
  UpdateContactSchema,
  ContactDateSchema,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  CreateApiClientSchema,
  CreateApiKeySchema,
} from './api-validation';

describe('api-validation schemas', () => {
  describe('HebrewDateSchema', () => {
    it('should accept valid Hebrew dates', () => {
      const validDate = { day: 15, month: 7, year: 5785 };
      const result = HebrewDateSchema.safeParse(validDate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid day (too low)', () => {
      const result = HebrewDateSchema.safeParse({
        day: 0,
        month: 7,
        year: 5785,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid day (too high)', () => {
      const result = HebrewDateSchema.safeParse({
        day: 31,
        month: 7,
        year: 5785,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid month', () => {
      const result = HebrewDateSchema.safeParse({
        day: 15,
        month: 15,
        year: 5785,
      });
      expect(result.success).toBe(false);
    });

    it('should accept month 14 for leap years', () => {
      const result = HebrewDateSchema.safeParse({
        day: 15,
        month: 14,
        year: 5785,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('GregorianDateSchema', () => {
    it('should accept valid YYYY-MM-DD format', () => {
      expect(GregorianDateSchema.safeParse('2025-01-15').success).toBe(true);
      expect(GregorianDateSchema.safeParse('2025-12-31').success).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(GregorianDateSchema.safeParse('01-15-2025').success).toBe(false);
      expect(GregorianDateSchema.safeParse('2025/01/15').success).toBe(false);
      expect(GregorianDateSchema.safeParse('2025-1-15').success).toBe(false);
      expect(GregorianDateSchema.safeParse('not-a-date').success).toBe(false);
    });
  });

  describe('ConvertDatesRequestSchema', () => {
    it('should accept valid Hebrew to Gregorian conversion', () => {
      const request = {
        conversions: [
          {
            from: 'hebrew',
            to: 'gregorian',
            date: { day: 15, month: 7, year: 5785 },
          },
        ],
      };
      const result = ConvertDatesRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid Gregorian to Hebrew conversion', () => {
      const request = {
        conversions: [
          {
            from: 'gregorian',
            to: 'hebrew',
            date: '2025-01-15',
          },
        ],
      };
      const result = ConvertDatesRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept multiple conversions', () => {
      const request = {
        conversions: [
          {
            from: 'hebrew',
            to: 'gregorian',
            date: { day: 1, month: 1, year: 5785 },
          },
          { from: 'gregorian', to: 'hebrew', date: '2025-01-01' },
        ],
      };
      const result = ConvertDatesRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty conversions array', () => {
      const request = { conversions: [] };
      const result = ConvertDatesRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 conversions', () => {
      const request = {
        conversions: Array(101).fill({
          from: 'hebrew',
          to: 'gregorian',
          date: { day: 1, month: 1, year: 5785 },
        }),
      };
      const result = ConvertDatesRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('OccurrencesRequestSchema', () => {
    it('should accept valid occurrences request', () => {
      const request = {
        dates: [{ hebrewDay: 15, hebrewMonth: 7, hebrewYear: 5750 }],
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      const result = OccurrencesRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept dates with optional title', () => {
      const request = {
        dates: [
          {
            hebrewDay: 15,
            hebrewMonth: 7,
            hebrewYear: 5750,
            title: 'Birthday',
          },
        ],
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      const result = OccurrencesRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateContactSchema', () => {
    it('should accept valid contact with required fields only', () => {
      const contact = {
        externalId: 'customer-123',
        name: 'John Doe',
      };
      const result = CreateContactSchema.safeParse(contact);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({});
        expect(result.data.dates).toEqual([]);
      }
    });

    it('should accept valid contact with all fields', () => {
      const contact = {
        externalId: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        metadata: { customerId: 456 },
        dates: [
          {
            type: 'birthday',
            hebrewDay: 15,
            hebrewMonth: 5,
            hebrewYear: 5750,
            notifyDaysBefore: 7,
          },
        ],
      };
      const result = CreateContactSchema.safeParse(contact);
      expect(result.success).toBe(true);
    });

    it('should reject contact without externalId', () => {
      const contact = { name: 'John Doe' };
      const result = CreateContactSchema.safeParse(contact);
      expect(result.success).toBe(false);
    });

    it('should reject contact without name', () => {
      const contact = { externalId: 'customer-123' };
      const result = CreateContactSchema.safeParse(contact);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const contact = {
        externalId: 'customer-123',
        name: 'John Doe',
        email: 'not-an-email',
      };
      const result = CreateContactSchema.safeParse(contact);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateContactSchema', () => {
    it('should accept partial updates', () => {
      expect(UpdateContactSchema.safeParse({ name: 'New Name' }).success).toBe(
        true,
      );
      expect(
        UpdateContactSchema.safeParse({ email: 'new@example.com' }).success,
      ).toBe(true);
      expect(UpdateContactSchema.safeParse({}).success).toBe(true);
    });

    it('should accept null email and phone', () => {
      const result = UpdateContactSchema.safeParse({
        email: null,
        phone: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ContactDateSchema', () => {
    it('should accept valid contact date', () => {
      const date = {
        type: 'birthday',
        hebrewDay: 15,
        hebrewMonth: 5,
        hebrewYear: 5750,
      };
      const result = ContactDateSchema.safeParse(date);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyDaysBefore).toBe(7); // default
      }
    });

    it('should accept custom notifyDaysBefore', () => {
      const date = {
        type: 'anniversary',
        hebrewDay: 1,
        hebrewMonth: 7,
        hebrewYear: 5780,
        notifyDaysBefore: 14,
      };
      const result = ContactDateSchema.safeParse(date);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyDaysBefore).toBe(14);
      }
    });

    it('should reject notifyDaysBefore > 365', () => {
      const date = {
        type: 'birthday',
        hebrewDay: 15,
        hebrewMonth: 5,
        hebrewYear: 5750,
        notifyDaysBefore: 400,
      };
      const result = ContactDateSchema.safeParse(date);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateWebhookSchema', () => {
    it('should accept valid HTTPS webhook URL', () => {
      const webhook = { url: 'https://example.com/webhook' };
      const result = CreateWebhookSchema.safeParse(webhook);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.events).toEqual(['date.upcoming']);
        expect(result.data.retryCount).toBe(3);
        expect(result.data.timeoutMs).toBe(30000);
      }
    });

    it('should reject HTTP webhook URL', () => {
      const webhook = { url: 'http://example.com/webhook' };
      const result = CreateWebhookSchema.safeParse(webhook);
      expect(result.success).toBe(false);
    });

    it('should accept custom retry settings', () => {
      const webhook = {
        url: 'https://example.com/webhook',
        retryCount: 5,
        timeoutMs: 10000,
      };
      const result = CreateWebhookSchema.safeParse(webhook);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.retryCount).toBe(5);
        expect(result.data.timeoutMs).toBe(10000);
      }
    });

    it('should reject retryCount > 10', () => {
      const webhook = {
        url: 'https://example.com/webhook',
        retryCount: 15,
      };
      const result = CreateWebhookSchema.safeParse(webhook);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateWebhookSchema', () => {
    it('should accept partial updates', () => {
      expect(UpdateWebhookSchema.safeParse({ isActive: false }).success).toBe(
        true,
      );
      expect(UpdateWebhookSchema.safeParse({ retryCount: 5 }).success).toBe(
        true,
      );
      expect(UpdateWebhookSchema.safeParse({}).success).toBe(true);
    });

    it('should reject HTTP URL on update', () => {
      const result = UpdateWebhookSchema.safeParse({
        url: 'http://example.com/webhook',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateApiClientSchema', () => {
    it('should accept valid client with required fields', () => {
      const client = {
        name: 'Test Client',
        contactEmail: 'test@example.com',
      };
      const result = CreateApiClientSchema.safeParse(client);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('basic');
      }
    });

    it('should accept premium tier', () => {
      const client = {
        name: 'Premium Client',
        contactEmail: 'premium@example.com',
        tier: 'premium',
      };
      const result = CreateApiClientSchema.safeParse(client);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('premium');
      }
    });

    it('should reject invalid tier', () => {
      const client = {
        name: 'Test Client',
        contactEmail: 'test@example.com',
        tier: 'enterprise',
      };
      const result = CreateApiClientSchema.safeParse(client);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateApiKeySchema', () => {
    it('should accept valid API key request', () => {
      const keyRequest = { name: 'Production Key' };
      const result = CreateApiKeySchema.safeParse(keyRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scopes).toEqual(['dates:read']);
      }
    });

    it('should accept custom scopes', () => {
      const keyRequest = {
        name: 'Full Access Key',
        scopes: ['dates:read', 'contacts:read', 'contacts:write'],
      };
      const result = CreateApiKeySchema.safeParse(keyRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scopes).toHaveLength(3);
      }
    });

    it('should accept expiration', () => {
      const keyRequest = {
        name: 'Temp Key',
        expiresInDays: 30,
      };
      const result = CreateApiKeySchema.safeParse(keyRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresInDays).toBe(30);
      }
    });

    it('should reject invalid scope', () => {
      const keyRequest = {
        name: 'Bad Key',
        scopes: ['invalid:scope'],
      };
      const result = CreateApiKeySchema.safeParse(keyRequest);
      expect(result.success).toBe(false);
    });
  });
});
