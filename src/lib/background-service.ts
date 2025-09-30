/**
 * Background Service for Year Progression
 * Runs automatic checks and updates for year progression
 */

import { query } from './postgres';
import { processUserYearProgression } from './year-progression';
import { getValidAccessToken } from './token-refresh';

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
      console.log('Year progression background service is disabled');
      return;
    }

    if (this.intervalId) {
      console.log('Year progression background service is already running');
      return;
    }

    console.log(
      `Starting year progression background service (interval: ${this.config.checkIntervalMs}ms)`,
    );

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
      console.log('Year progression background service stopped');
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
      console.log('Year progression check already running, skipping');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.runCount++;

    try {
      console.log(`Starting year progression check #${this.runCount}`);

      // Get all users with Google Calendar sync enabled
      const users = await this.getUsersWithGcalSync();
      console.log(
        `Found ${users.length} users with Google Calendar sync enabled`,
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

      console.log(
        `Year progression check #${this.runCount} completed successfully`,
      );
    } catch (error) {
      this.errorCount++;
      console.error(`Year progression check #${this.runCount} failed:`, error);
    } finally {
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
      console.error('Error getting users with Google Calendar sync:', error);
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
      console.log(`Processing year progression for user ${user.id}`);

      // Get a valid access token (will refresh if needed)
      const accessToken = await getValidAccessToken(user.id);
      if (!accessToken) {
        console.error(
          `Failed to get valid access token for user ${user.id}, skipping`,
        );
        return;
      }

      const result = await processUserYearProgression(
        user.id,
        accessToken,
        user.calbrew_calendar_id,
      );

      if (result.eventsUpdated > 0) {
        console.log(
          `Updated ${result.eventsUpdated} events for user ${user.id}`,
        );

        // Log updated events
        result.updatedEvents.forEach((event) => {
          console.log(
            `  - ${event.title}: synced years ${event.yearsNeedingSync.join(', ')}`,
          );
        });
      }

      if (result.eventsFailed > 0) {
        console.warn(
          `Failed to update ${result.eventsFailed} events for user ${user.id}`,
        );
        result.errors.forEach((error) => {
          console.warn(`  - ${error}`);
        });
      }

      if (result.eventsUpdated === 0 && result.eventsFailed === 0) {
        console.log(`No events needed updating for user ${user.id}`);
      }
    } catch (error) {
      console.error(
        `Error processing year progression for user ${user.id}:`,
        error,
      );
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
