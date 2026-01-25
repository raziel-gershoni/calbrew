import { describe, it, expect } from 'vitest';
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  buildUpcomingDatePayload,
  isQStashConfigured,
} from './qstash';

describe('qstash', () => {
  describe('generateWebhookSignature', () => {
    it('should generate consistent HMAC-SHA256 signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      const sig1 = generateWebhookSignature(payload, secret);
      const sig2 = generateWebhookSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';
      const sig1 = generateWebhookSignature('payload1', secret);
      const sig2 = generateWebhookSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = 'test-payload';
      const sig1 = generateWebhookSignature(payload, 'secret1');
      const sig2 = generateWebhookSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signatures', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'webhook-secret';
      const signature = generateWebhookSignature(payload, secret);

      const isValid = verifyWebhookSignature(
        payload,
        `sha256=${signature}`,
        secret,
      );
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'webhook-secret';

      const isValid = verifyWebhookSignature(
        payload,
        'sha256=invalid-signature',
        secret,
      );
      expect(isValid).toBe(false);
    });

    it('should reject signatures without sha256= prefix', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'webhook-secret';
      const signature = generateWebhookSignature(payload, secret);

      // Signature without prefix should fail
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it('should reject modified payloads', () => {
      const originalPayload = JSON.stringify({ event: 'test' });
      const modifiedPayload = JSON.stringify({ event: 'modified' });
      const secret = 'webhook-secret';
      const signature = generateWebhookSignature(originalPayload, secret);

      const isValid = verifyWebhookSignature(
        modifiedPayload,
        `sha256=${signature}`,
        secret,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('buildUpcomingDatePayload', () => {
    it('should build a valid date.upcoming payload', () => {
      const contacts = [
        {
          contactId: 'contact-123',
          externalId: 'ext-456',
          name: 'John Doe',
          dateType: 'birthday',
          hebrewDay: 15,
          hebrewMonth: 5,
          hebrewYear: 5750,
          gregorianDate: new Date('2025-02-13'),
          daysUntil: 7,
          anniversary: 45,
        },
      ];

      const payload = buildUpcomingDatePayload(contacts);

      expect(payload.event).toBe('date.upcoming');
      expect(payload.timestamp).toBeDefined();
      expect(payload.data.contacts).toHaveLength(1);
      expect(payload.data.contacts[0]).toEqual({
        contactId: 'contact-123',
        externalId: 'ext-456',
        name: 'John Doe',
        date: {
          type: 'birthday',
          hebrewDate: {
            day: 15,
            month: 5,
            year: 5750,
          },
          gregorianDate: '2025-02-13',
          daysUntil: 7,
          anniversary: 45,
        },
      });
    });

    it('should handle multiple contacts', () => {
      const contacts = [
        {
          contactId: 'contact-1',
          externalId: 'ext-1',
          name: 'Person 1',
          dateType: 'birthday',
          hebrewDay: 1,
          hebrewMonth: 1,
          hebrewYear: 5750,
          gregorianDate: new Date('2025-03-01'),
          daysUntil: 5,
          anniversary: 30,
        },
        {
          contactId: 'contact-2',
          externalId: 'ext-2',
          name: 'Person 2',
          dateType: 'anniversary',
          hebrewDay: 15,
          hebrewMonth: 7,
          hebrewYear: 5780,
          gregorianDate: new Date('2025-03-01'),
          daysUntil: 5,
          anniversary: 10,
        },
      ];

      const payload = buildUpcomingDatePayload(contacts);

      expect(payload.data.contacts).toHaveLength(2);
      expect(payload.data.contacts[0].name).toBe('Person 1');
      expect(payload.data.contacts[1].name).toBe('Person 2');
    });

    it('should format dates correctly', () => {
      const contacts = [
        {
          contactId: 'contact-123',
          externalId: 'ext-456',
          name: 'Test',
          dateType: 'birthday',
          hebrewDay: 5,
          hebrewMonth: 10,
          hebrewYear: 5785,
          gregorianDate: new Date('2025-01-05'),
          daysUntil: 0,
          anniversary: 0,
        },
      ];

      const payload = buildUpcomingDatePayload(contacts);

      expect(payload.data.contacts[0].date.gregorianDate).toBe('2025-01-05');
    });

    it('should include valid ISO timestamp', () => {
      const contacts = [
        {
          contactId: 'c1',
          externalId: 'e1',
          name: 'Test',
          dateType: 'test',
          hebrewDay: 1,
          hebrewMonth: 1,
          hebrewYear: 5785,
          gregorianDate: new Date(),
          daysUntil: 1,
          anniversary: 1,
        },
      ];

      const payload = buildUpcomingDatePayload(contacts);

      // Should be a valid ISO date string
      expect(() => new Date(payload.timestamp)).not.toThrow();
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });
  });

  describe('isQStashConfigured', () => {
    it('should return false when QSTASH_TOKEN is not set', () => {
      const originalToken = process.env.QSTASH_TOKEN;
      const originalCurrent = process.env.QSTASH_CURRENT_SIGNING_KEY;
      const originalNext = process.env.QSTASH_NEXT_SIGNING_KEY;

      delete process.env.QSTASH_TOKEN;
      delete process.env.QSTASH_CURRENT_SIGNING_KEY;
      delete process.env.QSTASH_NEXT_SIGNING_KEY;

      expect(isQStashConfigured()).toBe(false);

      // Restore
      if (originalToken) {
        process.env.QSTASH_TOKEN = originalToken;
      }
      if (originalCurrent) {
        process.env.QSTASH_CURRENT_SIGNING_KEY = originalCurrent;
      }
      if (originalNext) {
        process.env.QSTASH_NEXT_SIGNING_KEY = originalNext;
      }
    });
  });
});
