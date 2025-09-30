/**
 * Background Service for Year Progression
 * Runs automatic checks and updates for year progression
 */

import { query } from './postgres';
import { processUserYearProgression } from './year-progression';
import { getValidAccessToken } from './token-refresh';
import { componentLoggers } from './logger';
import * as SentryHelper from './logger/sentry';

const logger = componentLoggers.backgroundService;

export interface BackgroundServiceConfig {
  enabled: boolean;
  checkIntervalMs: number;
  maxConcurrentUsers: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: BackgroundServiceConfig = {
  enabled: process.env.BACKGROUND_YEAR_PROGRESSION_ENABLED === 'true',
  checkIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentUsers: 10,
  retryAttempts: 3,
  retryDelayMs: 5000,
};

class YearProgressionService {
  private config: BackgroundServiceConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRun: Date | null = null;
  private runCount = 0;
  private errorCount = 0;

  constructor(config: Partial<BackgroundServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the background service
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('Year progression background service is disabled');
      return;
    }

    if (this.intervalId) {
      logger.warn('Year progression background service is already running');
      return;
    }

    logger.info(
      { intervalMs: this.config.checkIntervalMs },
      'Starting year progression background service',
    );

    SentryHelper.addBreadcrumb({
      message: 'Background service started',
      category: 'service',
      level: 'info',
      data: { intervalMs: this.config.checkIntervalMs },
    });

    this.intervalId = setInterval(async () => {
      await this.runYearProgressionCheck();
    }, this.config.checkIntervalMs);

    // Run immediately on startup
    this.runYearProgressionCheck();
  }

  /**
   * Stop the background service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Year progression background service stopped');

      SentryHelper.addBreadcrumb({
        message: 'Background service stopped',
        category: 'service',
        level: 'info',
      });
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
    runCount: number;
    errorCount: number;
    config: BackgroundServiceConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      runCount: this.runCount,
      errorCount: this.errorCount,
      config: this.config,
    };
  }

  /**
   * Run year progression check for all users
   */
  private async runYearProgressionCheck(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Year progression check already running, skipping');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.runCount++;

    const transaction = SentryHelper.startTransaction(
      'year-progression-check',
      'background.job',
      { tags: { runCount: String(this.runCount) } },
    );

    try {
      logger.info(
        { runCount: this.runCount },
        'Starting year progression check',
      );

      // Get all users with Google Calendar sync enabled
      const users = await this.getUsersWithGcalSync();
      logger.info(
        { userCount: users.length, runCount: this.runCount },
        'Found users with Google Calendar sync enabled',
      );

      // Process users in batches to avoid overwhelming the system
      const batches = this.createBatches(users, this.config.maxConcurrentUsers);

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map((user) => this.processUserYearProgression(user)),
        );

        // Small delay between batches
        if (batches.length > 1) {
          await this.delay(1000);
        }
      }

      logger.info(
        { runCount: this.runCount, userCount: users.length },
        'Year progression check completed successfully',
      );
      transaction.setStatus('ok');
    } catch (error) {
      this.errorCount++;
      logger.error(
        { runCount: this.runCount, error, errorCount: this.errorCount },
        'Year progression check failed',
      );
      transaction.setStatus('internal_error');
      SentryHelper.captureException(error, {
        tags: {
          operation: 'year-progression-check',
          runCount: String(this.runCount),
        },
        level: 'error',
      });
    } finally {
      transaction.finish();
      this.isRunning = false;
    }
  }

  /**
   * Get users with Google Calendar sync enabled
   */
  private async getUsersWithGcalSync(): Promise<
    Array<{
      id: string;
      access_token: string;
      refresh_token: string;
      calbrew_calendar_id: string;
    }>
  > {
    try {
      const result = await query<{
        id: string;
        access_token: string;
        refresh_token: string;
        calbrew_calendar_id: string;
      }>(`
        SELECT id, access_token, refresh_token, calbrew_calendar_id
        FROM users
        WHERE access_token IS NOT NULL
        AND calbrew_calendar_id IS NOT NULL
        AND gcal_sync_enabled = true
      `);

      return result.rows;
    } catch (error) {
      logger.error({ error }, 'Error getting users with Google Calendar sync');
      SentryHelper.captureException(error, {
        tags: { operation: 'get-users-gcal-sync' },
        level: 'error',
      });
      return [];
    }
  }

  /**
   * Process year progression for a single user
   */
  private async processUserYearProgression(user: {
    id: string;
    access_token: string;
    refresh_token: string;
    calbrew_calendar_id: string;
  }): Promise<void> {
    try {
      logger.info({ userId: user.id }, 'Processing year progression for user');

      // Get a valid access token (will refresh if needed)
      const accessToken = await getValidAccessToken(user.id);
      if (!accessToken) {
        logger.error(
          { userId: user.id },
          'Failed to get valid access token, skipping user',
        );
        SentryHelper.captureMessage('Failed to get valid access token', {
          level: 'error',
          tags: { operation: 'process-user-year-progression', userId: user.id },
        });
        return;
      }

      const result = await processUserYearProgression(
        user.id,
        accessToken,
        user.calbrew_calendar_id,
      );

      if (result.eventsUpdated > 0) {
        logger.info(
          {
            userId: user.id,
            eventsUpdated: result.eventsUpdated,
            updatedEvents: result.updatedEvents.map((e) => ({
              title: e.title,
              years: e.yearsNeedingSync,
            })),
          },
          'Updated events for user',
        );
      }

      if (result.eventsFailed > 0) {
        logger.warn(
          {
            userId: user.id,
            eventsFailed: result.eventsFailed,
            errors: result.errors,
          },
          'Failed to update some events for user',
        );
        SentryHelper.captureMessage('Some events failed to update', {
          level: 'warning',
          tags: { operation: 'process-user-year-progression', userId: user.id },
          extra: { errors: result.errors, eventsFailed: result.eventsFailed },
        });
      }

      if (result.eventsUpdated === 0 && result.eventsFailed === 0) {
        logger.info({ userId: user.id }, 'No events needed updating for user');
      }
    } catch (error) {
      logger.error(
        { userId: user.id, error },
        'Error processing year progression for user',
      );
      SentryHelper.captureException(error, {
        tags: { operation: 'process-user-year-progression', userId: user.id },
        level: 'error',
      });
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let serviceInstance: YearProgressionService | null = null;

/**
 * Get or create the background service instance
 */
export function getYearProgressionService(): YearProgressionService {
  if (!serviceInstance) {
    serviceInstance = new YearProgressionService();
  }
  return serviceInstance;
}

/**
 * Start the background service
 */
export function startYearProgressionService(): void {
  const service = getYearProgressionService();
  service.start();
}

/**
 * Stop the background service
 */
export function stopYearProgressionService(): void {
  if (serviceInstance) {
    serviceInstance.stop();
  }
}

/**
 * Get service status
 */
export function getYearProgressionServiceStatus() {
  if (!serviceInstance) {
    return {
      isRunning: false,
      lastRun: null,
      runCount: 0,
      errorCount: 0,
      config: DEFAULT_CONFIG,
    };
  }
  return serviceInstance.getStatus();
}
