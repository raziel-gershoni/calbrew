import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HDate } from '@hebcal/core';
import { webcrypto } from 'crypto';
import type { NextRequest } from 'next/server';

// Ensure global crypto is available for the route module
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
  });
}

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((body, init) => ({ body, init })) },
}));

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}));
vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const { ensureCalendarExistsMock } = vi.hoisted(() => ({
  ensureCalendarExistsMock: vi.fn(),
}));
vi.mock('@/lib/google-calendar', () => ({
  ensureCalendarExists: ensureCalendarExistsMock,
}));

const mocks = vi.hoisted(() => ({
  dbCreateEventMock: vi.fn(),
  createEventOccurrencesBatchMock: vi.fn(),
  getCurrentCalendarIdMock: vi.fn(),
  getEventsByUserIdMock: vi.fn(),
  validateRequestMock: vi.fn(),
  createSuccessResponseMock: vi.fn((data: unknown) => data),
  createErrorResponseMock: vi.fn((message: unknown) => ({ error: message })),
  insertMock: vi.fn(),
  setCredentialsMock: vi.fn(),
}));

const {
  dbCreateEventMock,
  createEventOccurrencesBatchMock,
  getCurrentCalendarIdMock,
  validateRequestMock,
  insertMock,
  setCredentialsMock,
} = mocks;

vi.mock('@/lib/postgres-utils', () => ({
  getEventsByUserId: mocks.getEventsByUserIdMock,
  getCurrentCalendarId: mocks.getCurrentCalendarIdMock,
  createEvent: mocks.dbCreateEventMock,
  createEventOccurrencesBatch: mocks.createEventOccurrencesBatchMock,
}));

vi.mock('@/lib/validation', () => ({
  CreateEventSchema: {},
  createSuccessResponse: mocks.createSuccessResponseMock,
  createErrorResponse: mocks.createErrorResponseMock,
  validateRequest: mocks.validateRequestMock,
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: mocks.setCredentialsMock,
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        insert: mocks.insertMock,
      },
    })),
  },
}));

const retryMocks = vi.hoisted(() => ({
  withGoogleCalendarRetry: vi.fn(async (callback: () => Promise<unknown>) => {
    return await callback();
  }),
  AppError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
    toApiError() {
      return { message: this.message, code: this.code };
    }
  },
}));

vi.mock('@/lib/retry', () => retryMocks);

const withGoogleCalendarRetryMock = retryMocks.withGoogleCalendarRetry;

import { POST } from './route';

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-123' },
      accessToken: 'access-token',
    });
    getCurrentCalendarIdMock.mockResolvedValue('calendar-123');
    dbCreateEventMock.mockResolvedValue(undefined);
    createEventOccurrencesBatchMock.mockResolvedValue(undefined);
    ensureCalendarExistsMock.mockResolvedValue({ calendarId: 'calendar-123' });
  });

  it('persists multiple occurrences with batch insert for a wide sync window', async () => {
    const currentHebrewYear = new HDate().getFullYear();
    const hebrewYear = currentHebrewYear - 20;

    const requestPayload = {
      title: 'Test Event',
      description: 'Description',
      hebrew_year: hebrewYear,
      hebrew_month: 1,
      hebrew_day: 1,
      recurrence_rule: 'yearly',
      sync_with_gcal: true,
    };

    validateRequestMock.mockReturnValue({ success: true, data: requestPayload });

    let insertCounter = 0;
    insertMock.mockImplementation(async ({ requestBody }) => {
      insertCounter += 1;
      expect(requestBody.summary).toBeDefined();
      return { data: { id: `gcal-${insertCounter}` } };
    });

    const req = {
      json: vi.fn().mockResolvedValue(requestPayload),
    } satisfies Pick<NextRequest, 'json'>;

    await POST(req as unknown as NextRequest);

    const expectedStart = currentHebrewYear - 10;
    const expectedEnd = currentHebrewYear + 10;
    const expectedOccurrences = expectedEnd - expectedStart + 1;

    expect(insertMock).toHaveBeenCalledTimes(expectedOccurrences);
    expect(createEventOccurrencesBatchMock).toHaveBeenCalledTimes(1);
    const occurrences = createEventOccurrencesBatchMock.mock.calls[0][0];
    expect(occurrences).toHaveLength(expectedOccurrences);
    expect(new Set(occurrences.map((occ: { google_event_id: string }) => occ.google_event_id)).size).toBe(
      expectedOccurrences,
    );
    expect(setCredentialsMock).toHaveBeenCalledWith({ access_token: 'access-token' });
    expect(withGoogleCalendarRetryMock).toHaveBeenCalledTimes(expectedOccurrences);
  });
});
