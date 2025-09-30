/**
 * Tests for Validation Schemas
 * Priority 1: Pure functions with clear input/output, high ROI
 */

import { describe, it, expect } from 'vitest';
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventIdSchema,
  UserIdSchema,
  validateRequest,
  createSuccessResponse,
  createErrorResponse,
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
} from './validation';

describe('Validation Schemas', () => {
  describe('CreateEventSchema', () => {
    const validEvent = {
      title: 'Birthday',
      description: 'My birthday celebration',
      hebrew_year: 5784,
      hebrew_month: 7, // Tishrei
      hebrew_day: 15,
      recurrence_rule: 'yearly' as const,
      sync_with_gcal: true,
    };

    it('should accept valid event data', () => {
      const result = CreateEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Birthday');
        expect(result.data.hebrew_year).toBe(5784);
      }
    });

    it('should reject empty title', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        title: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required');
      }
    });

    it('should reject title longer than 200 characters', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title too long');
      }
    });

    it('should accept title of exactly 200 characters', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        title: 'a'.repeat(200),
      });
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 1000 characters', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        description: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Description too long');
      }
    });

    it('should accept optional description', () => {
      const { description, ...eventWithoutDesc } = validEvent;
      const result = CreateEventSchema.safeParse(eventWithoutDesc);
      expect(result.success).toBe(true);
    });

    it('should reject invalid hebrew_year (too small)', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_year: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew year');
      }
    });

    it('should reject invalid hebrew_year (too large)', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_year: 10000,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew year');
      }
    });

    it('should reject non-integer hebrew_year', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_year: 5784.5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept hebrew_month from 1 to 14 (leap year)', () => {
      for (let month = 1; month <= 14; month++) {
        const result = CreateEventSchema.safeParse({
          ...validEvent,
          hebrew_month: month,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject hebrew_month < 1', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_month: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew month');
      }
    });

    it('should reject hebrew_month > 14', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_month: 15,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew month');
      }
    });

    it('should accept hebrew_day from 1 to 30', () => {
      for (let day = 1; day <= 30; day++) {
        const result = CreateEventSchema.safeParse({
          ...validEvent,
          hebrew_day: day,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject hebrew_day < 1', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_day: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew day');
      }
    });

    it('should reject hebrew_day > 30', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        hebrew_day: 31,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid Hebrew day');
      }
    });

    it('should accept valid recurrence_rule values', () => {
      const rules = ['yearly', 'monthly', 'weekly'] as const;
      rules.forEach((rule) => {
        const result = CreateEventSchema.safeParse({
          ...validEvent,
          recurrence_rule: rule,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid recurrence_rule', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        recurrence_rule: 'daily',
      });
      expect(result.success).toBe(false);
    });

    it('should default sync_with_gcal to true when not provided', () => {
      const { sync_with_gcal, ...eventWithoutSync } = validEvent;
      const result = CreateEventSchema.safeParse(eventWithoutSync);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sync_with_gcal).toBe(true);
      }
    });

    it('should accept sync_with_gcal as false', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        sync_with_gcal: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sync_with_gcal).toBe(false);
      }
    });

    it('should strip extra fields not in schema (Zod default behavior)', () => {
      const result = CreateEventSchema.safeParse({
        ...validEvent,
        extraField: 'should be stripped',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect('extraField' in result.data).toBe(false);
      }
    });
  });

  describe('UpdateEventSchema', () => {
    const validUpdate = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Updated Birthday',
      description: 'Updated description',
      hebrew_year: 5785,
      hebrew_month: 1,
      hebrew_day: 1,
      recurrence_rule: 'yearly' as const,
      sync_with_gcal: true,
    };

    it('should accept valid update data with UUID', () => {
      const result = UpdateEventSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = UpdateEventSchema.safeParse({
        ...validUpdate,
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid event ID');
      }
    });

    it('should reject missing id field', () => {
      const { id, ...updateWithoutId } = validUpdate;
      const result = UpdateEventSchema.safeParse(updateWithoutId);
      expect(result.success).toBe(false);
    });

    it('should inherit all CreateEventSchema validations', () => {
      const result = UpdateEventSchema.safeParse({
        ...validUpdate,
        title: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required');
      }
    });
  });

  describe('EventIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = EventIdSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = EventIdSchema.safeParse({ id: 'invalid-uuid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid event ID');
      }
    });

    it('should reject missing id', () => {
      const result = EventIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('UserIdSchema', () => {
    it('should accept valid user ID', () => {
      const result = UserIdSchema.safeParse({ userId: 'user-123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty user ID', () => {
      const result = UserIdSchema.safeParse({ userId: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('User ID is required');
      }
    });

    it('should reject missing userId field', () => {
      const result = UserIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest helper', () => {
    it('should return success with valid data', () => {
      const data = {
        title: 'Test Event',
        hebrew_year: 5784,
        hebrew_month: 7,
        hebrew_day: 15,
        recurrence_rule: 'yearly',
      };

      const result = validateRequest(CreateEventSchema, data);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error with invalid data', () => {
      const data = {
        title: '',
        hebrew_year: 5784,
        hebrew_month: 7,
        hebrew_day: 15,
        recurrence_rule: 'yearly',
      };

      const result = validateRequest(CreateEventSchema, data);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      expect(result.details?.[0].field).toBe('title');
      expect(result.details?.[0].message).toBe('Title is required');
    });

    it('should handle multiple validation errors', () => {
      const data = {
        title: '',
        hebrew_year: 0,
        hebrew_month: 15,
        hebrew_day: 31,
        recurrence_rule: 'invalid',
      };

      const result = validateRequest(CreateEventSchema, data);

      expect(result.success).toBe(false);
      expect(result.details).toBeDefined();
      expect(result.details!.length).toBeGreaterThan(1);
    });

    it('should handle nested field paths', () => {
      const NestedSchema = CreateEventSchema.extend({
        metadata: CreateEventSchema.pick({ title: true }).optional(),
      });

      const result = validateRequest(NestedSchema, {
        title: 'Test',
        hebrew_year: 5784,
        hebrew_month: 7,
        hebrew_day: 15,
        recurrence_rule: 'yearly',
        metadata: { title: '' },
      });

      expect(result.success).toBe(false);
      if (!result.success && result.details) {
        const titleError = result.details.find((d) =>
          d.field.includes('metadata'),
        );
        expect(titleError).toBeDefined();
      }
    });
  });

  describe('API Response Helpers', () => {
    describe('createSuccessResponse', () => {
      it('should create success response with data', () => {
        const response = createSuccessResponse({ id: '123', name: 'Test' });
        expect(response.success).toBe(true);
        expect(response.data).toEqual({ id: '123', name: 'Test' });
      });

      it('should create success response with message', () => {
        const response = createSuccessResponse(undefined, 'Operation completed');
        expect(response.success).toBe(true);
        expect(response.message).toBe('Operation completed');
      });

      it('should create success response with both data and message', () => {
        const response = createSuccessResponse({ id: '123' }, 'Created');
        expect(response.success).toBe(true);
        expect(response.data).toEqual({ id: '123' });
        expect(response.message).toBe('Created');
      });

      it('should create minimal success response', () => {
        const response = createSuccessResponse();
        expect(response.success).toBe(true);
        expect(response.data).toBeUndefined();
        expect(response.message).toBeUndefined();
      });

      it('should validate against ApiSuccessResponseSchema', () => {
        const response = createSuccessResponse({ test: 'data' }, 'Success');
        const result = ApiSuccessResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    describe('createErrorResponse', () => {
      it('should create error response with message', () => {
        const response = createErrorResponse('Something went wrong');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Something went wrong');
      });

      it('should create error response with code', () => {
        const response = createErrorResponse('Not found', 'NOT_FOUND');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Not found');
        expect(response.code).toBe('NOT_FOUND');
      });

      it('should create error response with details array', () => {
        const details = [
          { field: 'title', message: 'Required' },
          { field: 'year', message: 'Invalid' },
        ];
        const response = createErrorResponse('Validation failed', 'VALIDATION_ERROR', details);
        expect(response.success).toBe(false);
        expect(response.details).toEqual(details);
      });

      it('should convert details object to array', () => {
        const detailsObject = {
          title: 'Required',
          year: 'Invalid',
        };
        const response = createErrorResponse('Validation failed', undefined, detailsObject);
        expect(response.success).toBe(false);
        expect(response.details).toEqual([
          { field: 'title', message: 'Required' },
          { field: 'year', message: 'Invalid' },
        ]);
      });

      it('should validate against ApiErrorResponseSchema', () => {
        const response = createErrorResponse('Error', 'CODE', [
          { field: 'test', message: 'Test error' },
        ]);
        const result = ApiErrorResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle Hebrew year boundaries (min)', () => {
      const result = CreateEventSchema.safeParse({
        title: 'Ancient Event',
        hebrew_year: 1,
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(true);
    });

    it('should handle Hebrew year boundaries (max)', () => {
      const result = CreateEventSchema.safeParse({
        title: 'Far Future Event',
        hebrew_year: 9999,
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(true);
    });

    it('should handle exactly 1000 character description', () => {
      const result = CreateEventSchema.safeParse({
        title: 'Test',
        description: 'a'.repeat(1000),
        hebrew_year: 5784,
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(true);
    });

    it('should reject null values for required fields', () => {
      const result = CreateEventSchema.safeParse({
        title: null,
        hebrew_year: 5784,
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(false);
    });

    it('should reject undefined values for required fields', () => {
      const result = CreateEventSchema.safeParse({
        title: 'Test',
        hebrew_year: undefined,
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(false);
    });

    it('should handle string numbers (should fail type validation)', () => {
      const result = CreateEventSchema.safeParse({
        title: 'Test',
        hebrew_year: '5784',
        hebrew_month: 7,
        hebrew_day: 1,
        recurrence_rule: 'yearly',
      });
      expect(result.success).toBe(false);
    });
  });
});
