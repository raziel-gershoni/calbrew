/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts up
 * Automatically initializes the database schema and runs migrations
 */

export function register(): void {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize database on server startup
    Promise.resolve()
      .then(async () => {
        const postgres = await import('./lib/postgres');
        const migrations = await import('./lib/migrations');

        await postgres.initializeDatabase();
        await migrations.runMigrations();
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
      });
  }
}
