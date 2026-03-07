import { describe, it, expect } from 'vitest';
import {
  ConvertDatesRequestSchema,
  OccurrencesRequestSchema,
  HolidaysRequestSchema,
  CreateContactSchema,
  CreateWebhookSchema,
} from '@/lib/api-validation';
import {
  convertDatesDefault,
  occurrencesDefault,
  holidaysDefaults,
  createContactDefault,
  createWebhookDefault,
} from '../lib/demo-defaults';

describe('demo-defaults', () => {
  it('convertDatesDefault passes ConvertDatesRequestSchema', () => {
    const result = ConvertDatesRequestSchema.safeParse(convertDatesDefault);
    expect(result.success).toBe(true);
  });

  it('occurrencesDefault passes OccurrencesRequestSchema', () => {
    const result = OccurrencesRequestSchema.safeParse(occurrencesDefault);
    expect(result.success).toBe(true);
  });

  it('holidaysDefaults passes HolidaysRequestSchema', () => {
    const result = HolidaysRequestSchema.safeParse(holidaysDefaults);
    expect(result.success).toBe(true);
  });

  it('createContactDefault passes CreateContactSchema', () => {
    const result = CreateContactSchema.safeParse(createContactDefault);
    expect(result.success).toBe(true);
  });

  it('createWebhookDefault passes CreateWebhookSchema', () => {
    const result = CreateWebhookSchema.safeParse(createWebhookDefault);
    expect(result.success).toBe(true);
  });

  it('convertDatesDefault contains both conversion directions', () => {
    expect(convertDatesDefault.conversions).toHaveLength(2);
    expect(convertDatesDefault.conversions[0].from).toBe('gregorian');
    expect(convertDatesDefault.conversions[1].from).toBe('hebrew');
  });

  it('occurrencesDefault has valid date range', () => {
    const start = new Date(occurrencesDefault.startDate);
    const end = new Date(occurrencesDefault.endDate);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('createContactDefault has at least one date', () => {
    expect(createContactDefault.dates.length).toBeGreaterThan(0);
  });

  it('createWebhookDefault URL starts with https', () => {
    expect(createWebhookDefault.url).toMatch(/^https:\/\//);
  });
});
