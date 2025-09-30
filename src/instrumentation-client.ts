/**
 * Client-side Instrumentation
 * Initializes Sentry for the browser
 */

import * as Sentry from '@sentry/nextjs';

export function register(): void {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    // 100% in dev for debugging, 10% in prod to stay within free tier
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

    // Session replay (disabled on free tier, enable when upgraded)
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.0,

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking (automatically set by Vercel)
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',

    // Ignore known errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Random plugins/extensions
      'instantSearchSDKJSBridgeClearHighlight',
      // Network errors (user's internet)
      'NetworkError',
      'Network request failed',
      // AbortController (user cancelled)
      'AbortError',
      'The operation was aborted',
    ],

    // Capture breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't log sensitive console messages
      if (breadcrumb.category === 'console') {
        const message = breadcrumb.message || '';
        if (message.includes('token') || message.includes('password')) {
          return null; // Drop this breadcrumb
        }
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

      // Sanitize user data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      return event;
    },
  });
}

/**
 * Export router transition hook for navigation instrumentation
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
