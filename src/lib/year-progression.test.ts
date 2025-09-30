/**
 * Tests for Year Progression Logic
 * Priority 1: Critical business logic for automatic event syncing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HDate } from '@hebcal/core';
import * as postgres from './postgres';
import * as postgresUtils from './postgres-utils';

// Mock modules
vi.mock('./postgres');
vi.mock('./postgres-utils');
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        insert: vi.fn(),
      },
    })),
  },
}));

// Import after mocking
import {
  checkEventYearProgression,
  checkUserYearProgression,
  getYearProgressionSummary,
} from './year-progression';

describe('Year Progression Logic', () => {
  const mockUserId = 'user-123';
  const mockEventId = 'event-123';
  const currentHebrewYear = new HDate().getFullYear();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkEventYearProgression', () => {
    it('should return null if event not found', async () => {
      vi.mocked(postgres.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeNull();
      expect(postgres.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, title, hebrew_year'),
        [mockEventId, mockUserId],
      );
    });

    it('should detect events needing updates (event from 2 years ago)', async () => {
      const twoYearsAgo = currentHebrewYear - 2;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Birthday',
            hebrew_year: twoYearsAgo,
            last_synced_hebrew_year: twoYearsAgo,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.needsUpdate).toBe(true);
      expect(result?.yearsNeedingSync.length).toBe(2); // Current year and last year
      expect(result?.lastSyncedYear).toBe(twoYearsAgo);
      expect(result?.currentYear).toBe(currentHebrewYear);
    });

    it('should detect no updates needed for current year event', async () => {
      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Recent Event',
            hebrew_year: currentHebrewYear,
            last_synced_hebrew_year: currentHebrewYear,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.needsUpdate).toBe(false);
      expect(result?.yearsNeedingSync.length).toBe(0);
    });

    it('should handle null last_synced_hebrew_year (use original year)', async () => {
      const threeYearsAgo = currentHebrewYear - 3;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Old Event',
            hebrew_year: threeYearsAgo,
            last_synced_hebrew_year: null,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.needsUpdate).toBe(true);
      expect(result?.lastSyncedYear).toBe(threeYearsAgo);
      expect(result?.yearsNeedingSync.length).toBe(3);
    });

    it('should calculate correct years needing sync', async () => {
      const fiveYearsAgo = currentHebrewYear - 5;
      const twoYearsAgo = currentHebrewYear - 2;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Partially Synced Event',
            hebrew_year: fiveYearsAgo,
            last_synced_hebrew_year: twoYearsAgo,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.yearsNeedingSync).toEqual([
        twoYearsAgo + 1,
        currentHebrewYear,
      ]);
    });

    it('should return null on database error', async () => {
      vi.mocked(postgres.query).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('checkUserYearProgression', () => {
    it('should return empty array if no events', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockResolvedValue([]);

      const result = await checkUserYearProgression(mockUserId);

      expect(result).toEqual([]);
    });

    it('should filter out events that do not need updates', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockResolvedValue([
        {
          id: 'event-1',
          user_id: mockUserId,
          title: 'Event 1',
          description: null,
          hebrew_year: currentHebrewYear,
          hebrew_month: 1,
          hebrew_day: 15,
          recurrence_rule: 'yearly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_hebrew_year: currentHebrewYear,
        },
        {
          id: 'event-2',
          user_id: mockUserId,
          title: 'Event 2',
          description: null,
          hebrew_year: currentHebrewYear - 2,
          hebrew_month: 7,
          hebrew_day: 1,
          recurrence_rule: 'yearly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_hebrew_year: currentHebrewYear - 2,
        },
      ]);

      // Mock checkEventYearProgression responses
      vi.mocked(postgres.query)
        .mockResolvedValueOnce({
          // event-1: up to date
          rows: [
            {
              id: 'event-1',
              title: 'Event 1',
              hebrew_year: currentHebrewYear,
              last_synced_hebrew_year: currentHebrewYear,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // event-2: needs update
          rows: [
            {
              id: 'event-2',
              title: 'Event 2',
              hebrew_year: currentHebrewYear - 2,
              last_synced_hebrew_year: currentHebrewYear - 2,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      const result = await checkUserYearProgression(mockUserId);

      expect(result.length).toBe(1);
      expect(result[0].eventId).toBe('event-2');
      expect(result[0].needsUpdate).toBe(true);
    });

    it('should handle errors gracefully and return empty array', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await checkUserYearProgression(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getYearProgressionSummary', () => {
    it('should return correct summary with no events', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockResolvedValue([]);

      const result = await getYearProgressionSummary(mockUserId);

      expect(result.totalEvents).toBe(0);
      expect(result.eventsNeedingUpdate).toBe(0);
      expect(result.eventsUpToDate).toBe(0);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('should count events needing updates vs up-to-date', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockResolvedValue([
        {
          id: 'event-1',
          user_id: mockUserId,
          title: 'Up to date',
          description: null,
          hebrew_year: currentHebrewYear,
          hebrew_month: 1,
          hebrew_day: 1,
          recurrence_rule: 'yearly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_hebrew_year: currentHebrewYear,
        },
        {
          id: 'event-2',
          user_id: mockUserId,
          title: 'Needs update',
          description: null,
          hebrew_year: currentHebrewYear - 2,
          hebrew_month: 1,
          hebrew_day: 1,
          recurrence_rule: 'yearly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_hebrew_year: currentHebrewYear - 2,
        },
        {
          id: 'event-3',
          user_id: mockUserId,
          title: 'Also needs update',
          description: null,
          hebrew_year: currentHebrewYear - 1,
          hebrew_month: 1,
          hebrew_day: 1,
          recurrence_rule: 'yearly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_hebrew_year: currentHebrewYear - 1,
        },
      ]);

      // Mock query responses for checkEventYearProgression
      vi.mocked(postgres.query)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-1',
              title: 'Up to date',
              hebrew_year: currentHebrewYear,
              last_synced_hebrew_year: currentHebrewYear,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-2',
              title: 'Needs update',
              hebrew_year: currentHebrewYear - 2,
              last_synced_hebrew_year: currentHebrewYear - 2,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-3',
              title: 'Also needs update',
              hebrew_year: currentHebrewYear - 1,
              last_synced_hebrew_year: currentHebrewYear - 1,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      const result = await getYearProgressionSummary(mockUserId);

      expect(result.totalEvents).toBe(3);
      expect(result.eventsNeedingUpdate).toBe(2);
      expect(result.eventsUpToDate).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(postgresUtils.getEventsByUserId).mockRejectedValue(
        new Error('Connection lost'),
      );

      const result = await getYearProgressionSummary(mockUserId);

      expect(result.totalEvents).toBe(0);
      expect(result.eventsNeedingUpdate).toBe(0);
      expect(result.eventsUpToDate).toBe(0);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle event created in future Hebrew year', async () => {
      const futureYear = currentHebrewYear + 1;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Future Event',
            hebrew_year: futureYear,
            last_synced_hebrew_year: futureYear,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.needsUpdate).toBe(false);
      expect(result?.yearsNeedingSync.length).toBe(0);
    });

    it('should handle very old event (10+ years)', async () => {
      const tenYearsAgo = currentHebrewYear - 10;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Ancient Event',
            hebrew_year: tenYearsAgo,
            last_synced_hebrew_year: tenYearsAgo,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.needsUpdate).toBe(true);
      expect(result?.yearsNeedingSync.length).toBe(10);
      expect(result?.yearsNeedingSync[0]).toBe(tenYearsAgo + 1);
      expect(result?.yearsNeedingSync[9]).toBe(currentHebrewYear);
    });

    it('should handle event synced partially through multiple years', async () => {
      const originalYear = currentHebrewYear - 5;
      const partialSyncYear = currentHebrewYear - 3;

      vi.mocked(postgres.query).mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: 'Partially Synced',
            hebrew_year: originalYear,
            last_synced_hebrew_year: partialSyncYear,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkEventYearProgression(mockEventId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.yearsNeedingSync).toEqual([
        partialSyncYear + 1,
        partialSyncYear + 2,
        currentHebrewYear,
      ]);
      expect(result?.hebrewYear).toBe(originalYear); // Original year preserved
    });
  });
});
