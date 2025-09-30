/**
 * Sentry Integration Helpers
 * Wrapper functions for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    user?: { id?: string; email?: string; username?: string };
    tags?: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  },
) {
  const scope = new Sentry.Scope();

  if (context?.user) {
    scope.setUser(context.user);
  }

  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  }

  if (context?.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
  }

  if (context?.level) {
    scope.setLevel(context.level);
  }

  return Sentry.captureException(error, scope);
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  context?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: Record<string, any>;
  },
) {
  const scope = new Sentry.Scope();

  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  }

  if (context?.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
  }

  return Sentry.captureMessage(message, {
    level: context?.level || 'info',
    ...scope,
  });
}

/**
 * Start a span for performance monitoring
 * Returns a simple object with setStatus and finish methods for compatibility
 */
export function startTransaction(
  _name: string,
  _op: string,
  _context?: {
    tags?: Record<string, string>;
    data?: Record<string, Record<string, unknown>>;
  },
): { setStatus: (status: string) => void; finish: () => void } {
  // For simpler transaction handling, we'll just use a dummy object
  // Real performance monitoring happens through Sentry.startSpan automatically
  return {
    setStatus: (_status: string) => {
      // No-op for now, Sentry handles this automatically
    },
    finish: () => {
      // No-op for now, Sentry handles this automatically
    },
  };
}

/**
 * Set user context for all future events
 */
export function setUser(
  user: {
    id?: string;
    email?: string;
    username?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null,
) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Wrap an async operation with error tracking and performance monitoring
 */
export async function withMonitoring<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: {
    tags?: Record<string, string>;
    user?: { id?: string };
  },
): Promise<T> {
  return Sentry.startSpan(
    {
      name: operation,
      op: 'function',
      attributes: context?.tags || {},
    },
    async () => {
      if (context?.user) {
        Sentry.setUser(context.user);
      }

      try {
        const result = await fn();
        return result;
      } catch (error) {
        captureException(error, {
          tags: {
            operation,
            ...context?.tags,
          },
          user: context?.user,
        });

        throw error;
      }
    },
  );
}

const SentryHelpers = {
  captureException,
  captureMessage,
  startTransaction,
  setUser,
  addBreadcrumb,
  withMonitoring,
};

export default SentryHelpers;
