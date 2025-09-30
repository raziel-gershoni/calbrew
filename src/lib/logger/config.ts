/**
 * Logger Configuration
 * Defines log levels and settings per environment
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint: boolean;
  redactPaths: string[];
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Environment-specific log levels
 */
export const LOG_LEVELS: Record<string, LogLevel> = {
  development: 'debug',
  test: 'warn',
  production: 'info',
};

/**
 * Get current log level based on environment
 */
export function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel;
  if (envLevel) {
    return envLevel;
  }

  return LOG_LEVELS[process.env.NODE_ENV || 'development'];
}

/**
 * Logger configuration
 */
export const loggerConfig: LoggerConfig = {
  level: getLogLevel(),
  prettyPrint: isDevelopment,

  // Redact sensitive data from logs
  redactPaths: [
    'access_token',
    'refresh_token',
    'password',
    'authorization',
    'cookie',
    'req.headers.authorization',
    'req.headers.cookie',
    'token',
    'secret',
  ],
};

/**
 * Sanitize sensitive data for logging
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeForLogging(data: any): any {
  if (!data) {
    return data;
  }

  const sensitive = ['token', 'password', 'secret', 'authorization', 'cookie'];

  if (typeof data === 'string') {
    // Mask tokens (show last 4 chars only)
    if (
      data.length > 20 &&
      (data.includes('Bearer') || data.includes('ya29'))
    ) {
      return `***${data.slice(-4)}`;
    }
    return data;
  }

  if (typeof data === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitive.some((s) => lowerKey.includes(s));

      if (isSensitive && typeof data[key] === 'string') {
        // Mask sensitive fields
        sanitized[key] =
          data[key].length > 4 ? `***${data[key].slice(-4)}` : '***';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeForLogging(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }

  return data;
}
