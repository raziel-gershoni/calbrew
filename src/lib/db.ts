
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
      google_calendar_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
});

export default db;
