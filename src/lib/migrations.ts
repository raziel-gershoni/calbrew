/**
 * Database migration system for PostgreSQL
 * Automatically runs migrations on application startup
 */

import { query } from './postgres';

interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

// Define all migrations in order
const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_hebrew_event_preferences',
    up: `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hebrew_event_preferences JSONB 
      DEFAULT '{"majorHolidays": true, "minorHolidays": true, "fastDays": true, "roshChodesh": true, "modernHolidays": false, "torahReadings": false, "specialShabbat": false, "omerCount": false, "dafYomi": false, "mishnaYomi": false, "yerushalmiYomi": false, "nachYomi": false, "chanukahCandles": false}';
      
      UPDATE users 
      SET hebrew_event_preferences = '{"majorHolidays": true, "minorHolidays": true, "fastDays": true, "roshChodesh": true, "modernHolidays": false, "torahReadings": false, "specialShabbat": false, "omerCount": false, "dafYomi": false, "mishnaYomi": false, "yerushalmiYomi": false, "nachYomi": false, "chanukahCandles": false}'
      WHERE hebrew_event_preferences IS NULL;
    `,
    down: `
      ALTER TABLE users DROP COLUMN IF EXISTS hebrew_event_preferences;
    `,
  },
  {
    version: 2,
    name: 'add_daily_learning_preferences',
    up: `
      -- Add new columns for separated preferences
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hebrew_calendar_preferences JSONB 
      DEFAULT '{"majorHolidays": true, "minorHolidays": true, "fastDays": true, "roshChodesh": true, "modernHolidays": false, "torahReadings": false, "specialShabbat": false, "omerCount": false}';
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS daily_learning_preferences JSONB 
      DEFAULT '{"dafYomi": false, "mishnaYomi": false, "yerushalmiYomi": false, "nachYomi": false}';
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS daily_learning_enabled BOOLEAN DEFAULT TRUE;
      
      -- Migrate existing hebrew_event_preferences to new separated structure
      UPDATE users 
      SET 
        hebrew_calendar_preferences = jsonb_build_object(
          'majorHolidays', COALESCE(hebrew_event_preferences->>'majorHolidays', 'true')::boolean,
          'minorHolidays', COALESCE(hebrew_event_preferences->>'minorHolidays', 'true')::boolean,
          'fastDays', COALESCE(hebrew_event_preferences->>'fastDays', 'true')::boolean,
          'roshChodesh', COALESCE(hebrew_event_preferences->>'roshChodesh', 'true')::boolean,
          'modernHolidays', COALESCE(hebrew_event_preferences->>'modernHolidays', 'false')::boolean,
          'torahReadings', COALESCE(hebrew_event_preferences->>'torahReadings', 'false')::boolean,
          'specialShabbat', COALESCE(hebrew_event_preferences->>'specialShabbat', 'false')::boolean,
          'omerCount', COALESCE(hebrew_event_preferences->>'omerCount', 'false')::boolean
        ),
        daily_learning_preferences = jsonb_build_object(
          'dafYomi', COALESCE(hebrew_event_preferences->>'dafYomi', 'false')::boolean,
          'mishnaYomi', COALESCE(hebrew_event_preferences->>'mishnaYomi', 'false')::boolean,
          'yerushalmiYomi', COALESCE(hebrew_event_preferences->>'yerushalmiYomi', 'false')::boolean,
          'nachYomi', COALESCE(hebrew_event_preferences->>'nachYomi', 'false')::boolean
        )
      WHERE hebrew_event_preferences IS NOT NULL;
    `,
    down: `
      ALTER TABLE users DROP COLUMN IF EXISTS hebrew_calendar_preferences;
      ALTER TABLE users DROP COLUMN IF EXISTS daily_learning_preferences;
      ALTER TABLE users DROP COLUMN IF EXISTS daily_learning_enabled;
    `,
  },
  // Add future migrations here with incrementing version numbers
];

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get the current database version
 */
async function getCurrentVersion(): Promise<number> {
  try {
    const result = await query<{ version: number }>(
      'SELECT MAX(version) as version FROM migrations',
    );
    return result.rows[0]?.version || 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Run a single migration
 */
async function runMigration(migration: Migration): Promise<void> {
  console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);

  try {
    // Execute the migration SQL
    await query(migration.up);

    // Record that this migration was applied
    await query('INSERT INTO migrations (version, name) VALUES ($1, $2)', [
      migration.version,
      migration.name,
    ]);

    console.log(`✅ Migration ${migration.version} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('🔄 Checking for database migrations...');

  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get current database version
    const currentVersion = await getCurrentVersion();
    console.log(`📊 Current database version: ${currentVersion}`);

    // Find migrations that need to be applied
    const pendingMigrations = migrations.filter(
      (m) => m.version > currentVersion,
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`📈 Found ${pendingMigrations.length} pending migrations`);

    // Run each pending migration in order
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }

    console.log('🎉 All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
}

/**
 * Get migration status for debugging
 */
export async function getMigrationStatus(): Promise<
  { version: number; name: string; applied_at: string }[]
> {
  try {
    await createMigrationsTable();
    const result = await query<{
      version: number;
      name: string;
      applied_at: string;
    }>('SELECT version, name, applied_at FROM migrations ORDER BY version');
    return result.rows;
  } catch (error) {
    console.error('Error getting migration status:', error);
    return [];
  }
}
