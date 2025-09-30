/**
 * Centralized Logging System
 * Structured logging with Pino and Sentry integration
 */

import pino from 'pino';
import { loggerConfig, sanitizeForLogging } from './config';

// Create base logger instance
// Note: We avoid pino-pretty transport during Next.js instrumentation phase
// as it creates worker threads that don't work well with Next.js's build system
const pinoLogger = pino({
  level: loggerConfig.level,

  // Always use JSON output to avoid worker thread issues
  // Pretty formatting can be added via CLI: npm run dev | pino-pretty
  transport: undefined,

  // Base fields for all logs
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'calbrew',
  },

  // Redact sensitive fields
  redact: {
    paths: loggerConfig.redactPaths,
    censor: '***REDACTED***',
  },

  // Custom serializers
  serializers: {
    error: pino.stdSerializers.err,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      // Sanitize headers
      headers: sanitizeForLogging(req.headers),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: res.headers,
    }),
  },
});

/**
 * Logger interface with structured logging methods
 */
export interface Logger {
  trace(obj: object, msg?: string): void;
  trace(msg: string): void;
  debug(obj: object, msg?: string): void;
  debug(msg: string): void;
  info(obj: object, msg?: string): void;
  info(msg: string): void;
  warn(obj: object, msg?: string): void;
  warn(msg: string): void;
  error(obj: object, msg?: string): void;
  error(msg: string): void;
  fatal(obj: object, msg?: string): void;
  fatal(msg: string): void;
  child(bindings: object): Logger;
}

/**
 * Create a child logger with context
 */
export function createLogger(context: {
  component?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}): Logger {
  return pinoLogger.child(context) as unknown as Logger;
}

/**
 * Default logger instance
 */
export const logger = pinoLogger as unknown as Logger;

/**
 * Logger for specific components
 */
export const componentLoggers = {
  auth: createLogger({ component: 'auth' }),
  database: createLogger({ component: 'database' }),
  googleApi: createLogger({ component: 'google-api' }),
  backgroundService: createLogger({ component: 'background-service' }),
  yearProgression: createLogger({ component: 'year-progression' }),
  api: createLogger({ component: 'api' }),
  migration: createLogger({ component: 'migration' }),
};

/**
 * Log an operation with timing
 */
export async function logOperation<T>(
  logger: Logger,
  operation: string,
  context: object,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  logger.info({ ...context, operation }, `Starting ${operation}`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.info(
      { ...context, operation, duration },
      `Completed ${operation} in ${duration}ms`,
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      {
        ...context,
        operation,
        duration,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
      },
      `Failed ${operation} after ${duration}ms`,
    );

    throw error;
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(
  logger: Logger,
  operation: string,
  duration: number,
  context: object = {},
) {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';

  logger[level](
    {
      ...context,
      operation,
      duration,
      performance: true,
    },
    `${operation} took ${duration}ms`,
  );
}

export default logger;
