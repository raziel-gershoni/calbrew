import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('calbrew.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified DATETIME,
      image TEXT,
      calbrew_calendar_id TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      hebrew_year INTEGER NOT NULL,
      hebrew_month TEXT NOT NULL,
      hebrew_day INTEGER NOT NULL,
      recurrence_rule TEXT NOT NULL,
      last_synced_hebrew_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_occurrences (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      gregorian_date TEXT NOT NULL,
      google_event_id TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events (id)
    )
  `);
});

export default db;