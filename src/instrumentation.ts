/**
 * Next.js Instrumentation Hook
 * This file runs once when the application starts up
 * Automatically initializes the database schema and runs migrations
 * Also initializes Sentry for server and edge runtimes
 */

import * as Sentry from '@sentry/nextjs';

export function register(): void {
  // Initialize Sentry for server runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance monitoring
      // 100% in dev for debugging, 10% in prod to stay within free tier
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

      // Environment
      environment: process.env.NODE_ENV,

      // Release tracking (automatically set by Vercel)
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

      // Enable debug in development
      debug: process.env.NODE_ENV === 'development',

      // Capture more context
      maxBreadcrumbs: 50,

      // Integrations (Console and HTTP are automatically included in Next.js Sentry SDK)
      integrations: [],

      // Ignore known errors
      ignoreErrors: [
        // Database connection errors (transient)
        'ECONNREFUSED',
        'ETIMEDOUT',
        // NextAuth.js expected errors
        'AccessDenied',
        'OAuthSignin',
      ],

      // Capture breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Sanitize sensitive data in breadcrumbs
        if (breadcrumb.category === 'http') {
          if (breadcrumb.data?.url?.includes('token')) {
            breadcrumb.data.url = '[REDACTED]';
          }
        }

        if (
          breadcrumb.message?.includes('token') ||
          breadcrumb.message?.includes('password')
        ) {
          breadcrumb.message = '[REDACTED]';
        }

        return breadcrumb;
      },

      // Sanitize events before sending
      beforeSend(event) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Sentry Event (not sent in dev):', event);
          return null;
        }

        // Sanitize request data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-auth-token'];
          }

          // Sanitize query params
          if (
            event.request.query_string &&
            typeof event.request.query_string === 'string'
          ) {
            event.request.query_string = event.request.query_string
              .replace(/token=[^&]*/g, 'token=[REDACTED]')
              .replace(/key=[^&]*/g, 'key=[REDACTED]');
          }
        }

        // Sanitize extra data
        if (event.extra) {
          for (const key in event.extra) {
            const lowerKey = key.toLowerCase();
            if (
              lowerKey.includes('token') ||
              lowerKey.includes('password') ||
              lowerKey.includes('secret') ||
              lowerKey.includes('key')
            ) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }

        return event;
      },
    });

    // Initialize database on server startup
    Promise.resolve()
      .then(async () => {
        const postgres = await import('./lib/postgres');
        const migrations = await import('./lib/migrations');

        await postgres.initializeDatabase();
        await migrations.runMigrations();
      })
      .then(async () => {
        // Start background services
        const backgroundService = await import('./lib/background-service');
        backgroundService.startYearProgressionService();
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
      });
  }

  // Initialize Sentry for edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance monitoring
      // 100% in dev for debugging, 10% in prod to stay within free tier
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

      // Environment
      environment: process.env.NODE_ENV,

      // Release tracking
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

      // Debug in development
      debug: process.env.NODE_ENV === 'development',

      // Sanitize before sending
      beforeSend(event) {
        // Don't send in development
        if (process.env.NODE_ENV === 'development') {
          return null;
        }

        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        return event;
      },
    });
  }
}

// Hook to capture errors from nested React Server Components
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  errorContext: {
    routerKind: string;
    routePath: string;
    routeType: string;
  },
) {
  Sentry.captureRequestError(err, request, errorContext);
}
