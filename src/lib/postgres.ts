import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Helper function to execute queries
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper function to execute transactions
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  console.log('🔄 Initializing PostgreSQL database...');

  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        email_verified TIMESTAMPTZ,
        image TEXT,
        calbrew_calendar_id TEXT,
        language TEXT DEFAULT 'en',
        calendar_mode TEXT DEFAULT 'hebrew',
        gcal_sync_enabled BOOLEAN DEFAULT TRUE,
        hebrew_events_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');

    // Create events table
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        hebrew_year INTEGER NOT NULL,
        hebrew_month INTEGER NOT NULL,
        hebrew_day INTEGER NOT NULL,
        recurrence_rule TEXT NOT NULL DEFAULT 'yearly',
        last_synced_hebrew_year INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Events table created/verified');

    // Create event_occurrences table
    await query(`
      CREATE TABLE IF NOT EXISTS event_occurrences (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        gregorian_date TEXT NOT NULL,
        google_event_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Event occurrences table created/verified');

    // Create indexes for better performance
    await query(
      'CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)',
    );
    await query(
      'CREATE INDEX IF NOT EXISTS idx_event_occurrences_event_id ON event_occurrences(event_id)',
    );
    await query(
      'CREATE INDEX IF NOT EXISTS idx_event_occurrences_date ON event_occurrences(gregorian_date)',
    );
    console.log('✅ Database indexes created/verified');

    console.log('🎉 PostgreSQL database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export default pool;
