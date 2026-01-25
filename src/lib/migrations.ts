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
  {
    version: 3,
    name: 'add_year_progression_index',
    up: `
      -- Create index for faster year progression queries
      CREATE INDEX IF NOT EXISTS idx_events_last_synced_hebrew_year
      ON events(last_synced_hebrew_year);
    `,
    down: `
      DROP INDEX IF EXISTS idx_events_last_synced_hebrew_year;
    `,
  },
  {
    version: 4,
    name: 'add_oauth_tokens_to_users',
    up: `
      -- Add OAuth token columns for background service access
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS access_token TEXT;

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS refresh_token TEXT;

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS token_expires_at BIGINT;

      -- Create index for token expiry checks
      CREATE INDEX IF NOT EXISTS idx_users_token_expires_at
      ON users(token_expires_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_users_token_expires_at;
      ALTER TABLE users DROP COLUMN IF EXISTS access_token;
      ALTER TABLE users DROP COLUMN IF EXISTS refresh_token;
      ALTER TABLE users DROP COLUMN IF EXISTS token_expires_at;
    `,
  },
  {
    version: 5,
    name: 'add_api_clients_table',
    up: `
      -- Third-party API client registration
      CREATE TABLE IF NOT EXISTS api_clients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium')),
        contact_email TEXT NOT NULL,
        rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
        rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for active clients lookup
      CREATE INDEX IF NOT EXISTS idx_api_clients_is_active ON api_clients(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_api_clients_is_active;
      DROP TABLE IF EXISTS api_clients;
    `,
  },
  {
    version: 6,
    name: 'add_api_keys_table',
    up: `
      -- API key management (hashed storage)
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        name TEXT NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT ARRAY['dates:read'],
        last_used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for key lookup
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
    `,
    down: `
      DROP INDEX IF EXISTS idx_api_keys_key_prefix;
      DROP INDEX IF EXISTS idx_api_keys_client_id;
      DROP INDEX IF EXISTS idx_api_keys_key_hash;
      DROP TABLE IF EXISTS api_keys;
    `,
  },
  {
    version: 7,
    name: 'add_api_rate_limits_table',
    up: `
      -- Rate limiting tracking
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        window_start TIMESTAMPTZ NOT NULL,
        window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day')),
        request_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, window_start, window_type)
      );

      -- Create index for rate limit lookups
      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup
        ON api_rate_limits(client_id, window_type, window_start);

      -- Create index for cleanup of old records
      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start
        ON api_rate_limits(window_start);
    `,
    down: `
      DROP INDEX IF EXISTS idx_api_rate_limits_window_start;
      DROP INDEX IF EXISTS idx_api_rate_limits_lookup;
      DROP TABLE IF EXISTS api_rate_limits;
    `,
  },
  {
    version: 8,
    name: 'add_api_contacts_tables',
    up: `
      -- Contacts with Hebrew dates for Tier 2 clients
      CREATE TABLE IF NOT EXISTS api_contacts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, external_id)
      );

      -- Hebrew dates per contact
      CREATE TABLE IF NOT EXISTS api_contact_dates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        contact_id TEXT NOT NULL REFERENCES api_contacts(id) ON DELETE CASCADE,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        date_type TEXT NOT NULL,
        hebrew_day INTEGER NOT NULL CHECK (hebrew_day >= 1 AND hebrew_day <= 30),
        hebrew_month INTEGER NOT NULL CHECK (hebrew_month >= 1 AND hebrew_month <= 14),
        hebrew_year INTEGER NOT NULL CHECK (hebrew_year >= 1 AND hebrew_year <= 9999),
        notify_days_before INTEGER DEFAULT 7,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for contact lookups
      CREATE INDEX IF NOT EXISTS idx_api_contacts_client_id ON api_contacts(client_id);
      CREATE INDEX IF NOT EXISTS idx_api_contacts_external_id ON api_contacts(client_id, external_id);
      CREATE INDEX IF NOT EXISTS idx_api_contact_dates_contact_id ON api_contact_dates(contact_id);
      CREATE INDEX IF NOT EXISTS idx_api_contact_dates_client_id ON api_contact_dates(client_id);
      CREATE INDEX IF NOT EXISTS idx_api_contact_dates_month_day ON api_contact_dates(hebrew_month, hebrew_day);
    `,
    down: `
      DROP INDEX IF EXISTS idx_api_contact_dates_month_day;
      DROP INDEX IF EXISTS idx_api_contact_dates_client_id;
      DROP INDEX IF EXISTS idx_api_contact_dates_contact_id;
      DROP INDEX IF EXISTS idx_api_contacts_external_id;
      DROP INDEX IF EXISTS idx_api_contacts_client_id;
      DROP TABLE IF EXISTS api_contact_dates;
      DROP TABLE IF EXISTS api_contacts;
    `,
  },
  {
    version: 9,
    name: 'add_webhook_tables',
    up: `
      -- Webhook configuration
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT ARRAY['date.upcoming'],
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        retry_count INTEGER NOT NULL DEFAULT 3,
        timeout_ms INTEGER NOT NULL DEFAULT 30000,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Webhook delivery tracking & retry queue
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        webhook_config_id TEXT NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMPTZ,
        next_retry_at TIMESTAMPTZ,
        response_status INTEGER,
        response_body TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for webhook lookups
      CREATE INDEX IF NOT EXISTS idx_webhook_configs_client_id ON webhook_configs(client_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_client_id ON webhook_deliveries(client_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
        WHERE status = 'pending';
    `,
    down: `
      DROP INDEX IF EXISTS idx_webhook_deliveries_next_retry;
      DROP INDEX IF EXISTS idx_webhook_deliveries_status;
      DROP INDEX IF EXISTS idx_webhook_deliveries_client_id;
      DROP INDEX IF EXISTS idx_webhook_configs_client_id;
      DROP TABLE IF EXISTS webhook_deliveries;
      DROP TABLE IF EXISTS webhook_configs;
    `,
  },
  {
    version: 10,
    name: 'add_oauth_tables',
    up: `
      -- OAuth2 client credentials for enterprise clients
      CREATE TABLE IF NOT EXISTS oauth_clients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
        oauth_client_id TEXT NOT NULL UNIQUE,
        oauth_client_secret_hash TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- OAuth2 access tokens
      CREATE TABLE IF NOT EXISTS oauth_access_tokens (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        oauth_client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        scopes TEXT[] NOT NULL DEFAULT ARRAY['dates:read'],
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for OAuth lookups
      CREATE INDEX IF NOT EXISTS idx_oauth_clients_oauth_client_id ON oauth_clients(oauth_client_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token_hash ON oauth_access_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_expires_at ON oauth_access_tokens(expires_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_oauth_access_tokens_expires_at;
      DROP INDEX IF EXISTS idx_oauth_access_tokens_token_hash;
      DROP INDEX IF EXISTS idx_oauth_clients_oauth_client_id;
      DROP TABLE IF EXISTS oauth_access_tokens;
      DROP TABLE IF EXISTS oauth_clients;
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
