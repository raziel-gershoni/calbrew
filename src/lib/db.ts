import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'calbrew.db');
console.log('Database path:', dbPath);

// Enable verbose mode for debugging in development
const verbose =
  process.env.NODE_ENV === 'development' ? sqlite3.verbose() : sqlite3;

const db = new verbose.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    throw err;
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Enable foreign key constraints
db.get('PRAGMA foreign_keys = ON');

// Enable WAL mode for better concurrent access
db.get('PRAGMA journal_mode = WAL');

db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified DATETIME,
      image TEXT,
      calbrew_calendar_id TEXT,
      language TEXT DEFAULT 'en',
      hebrew_events_enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      }
    },
  );

  // Add hebrew_events_enabled column if it doesn't exist (migration)
  db.run(
    `ALTER TABLE users ADD COLUMN hebrew_events_enabled BOOLEAN DEFAULT 1`,
    (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(
          'Error adding hebrew_events_enabled column:',
          err.message,
        );
      }
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      hebrew_year INTEGER NOT NULL,
      hebrew_month INTEGER NOT NULL,
      hebrew_day INTEGER NOT NULL,
      recurrence_rule TEXT NOT NULL DEFAULT 'yearly',
      last_synced_hebrew_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating events table:', err.message);
      }
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS event_occurrences (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      gregorian_date TEXT NOT NULL,
      google_event_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) {
        console.error('Error creating event_occurrences table:', err.message);
      }
    },
  );

  // Add language column to existing users table if it doesn't exist
  db.run(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding language column:', err.message);
    }
  });

  // Add calendar_mode column to existing users table if it doesn't exist
  db.run(
    `ALTER TABLE users ADD COLUMN calendar_mode TEXT DEFAULT 'hebrew'`,
    (err) => {
      // Ignore error if column already exists
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding calendar_mode column:', err.message);
      }
    },
  );

  // Add gcal_sync_enabled column to existing users table if it doesn't exist
  db.run(
    `ALTER TABLE users ADD COLUMN gcal_sync_enabled BOOLEAN DEFAULT TRUE`,
    (err) => {
      // Ignore error if column already exists
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding gcal_sync_enabled column:', err.message);
      }
    },
  );

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_event_occurrences_event_id ON event_occurrences(event_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_event_occurrences_date ON event_occurrences(gregorian_date)`,
  );
});

export default db;
