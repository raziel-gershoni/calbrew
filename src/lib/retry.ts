import { createErrorResponse, ApiErrorResponse } from './validation';

// Error interfaces for better typing
interface NetworkError {
  code?: string;
  message?: string;
}

interface HttpError extends NetworkError {
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

type RetryableError = NetworkError | HttpError | Error;

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBackoff: boolean;
  retryCondition?: (error: RetryableError) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBackoff: true,
  retryCondition: (error: RetryableError) => {
    // Retry on network errors, 5xx server errors, and specific API errors
    const networkError = error as NetworkError;
    if (
      networkError?.code === 'ECONNRESET' ||
      networkError?.code === 'ETIMEDOUT'
    ) {
      return true;
    }
    const httpError = error as HttpError;
    if (httpError?.response?.status && httpError.response.status >= 500) {
      return true;
    }
    // Google Calendar specific retryable errors
    if (httpError?.response?.status === 429) {
      // Rate limited
      return true;
    }
    if (
      httpError?.response?.status === 403 &&
      httpError?.response?.data?.error?.message?.includes('quotaExceeded')
    ) {
      return true;
    }
    return false;
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: RetryableError | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as RetryableError;

      // Don't retry if this is the last attempt or if retry condition fails
      if (
        attempt === config.maxAttempts ||
        !config.retryCondition?.(lastError)
      ) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = config.baseDelay;
      if (config.exponentialBackoff) {
        delay = Math.min(
          config.baseDelay * Math.pow(2, attempt - 1),
          config.maxDelay,
        );
      }

      console.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms:`,
        lastError?.message || lastError,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!lastError) {
    throw new Error('Operation failed with no error details');
  }
  throw lastError;
}

// Google Calendar specific retry wrapper
export async function withGoogleCalendarRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Google Calendar operation',
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 4,
    baseDelay: 1500,
    maxDelay: 15000,
    retryCondition: (error: RetryableError) => {
      // Log the error for debugging
      console.error(`${operationName} error:`, {
        status: (error as HttpError)?.response?.status,
        message: error?.message,
        code: (error as NetworkError)?.code,
      });

      // Retry on network errors
      const networkError = error as NetworkError;
      if (
        networkError?.code === 'ECONNRESET' ||
        networkError?.code === 'ETIMEDOUT' ||
        networkError?.code === 'ENOTFOUND'
      ) {
        return true;
      }

      // Retry on server errors
      const httpError = error as HttpError;
      if (httpError?.response?.status && httpError.response.status >= 500) {
        return true;
      }

      // Retry on rate limiting
      if (httpError?.response?.status === 429) {
        return true;
      }

      // Retry on quota exceeded
      if (httpError?.response?.status === 403) {
        const errorMessage = httpError?.response?.data?.error?.message || '';
        if (
          errorMessage.includes('quotaExceeded') ||
          errorMessage.includes('userRateLimitExceeded')
        ) {
          return true;
        }
      }

      // Don't retry on authentication errors or client errors (except rate limits)
      return false;
    },
  });
}

// Database retry wrapper for transient errors
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation',
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    retryCondition: (error: RetryableError) => {
      console.error(`${operationName} error:`, error?.message || error);

      // Retry on database connection errors (PostgreSQL)
      const networkError = error as NetworkError;
      if (
        error?.message?.includes('connection terminated') ||
        error?.message?.includes('server closed the connection') ||
        error?.message?.includes('timeout expired') ||
        networkError?.code === 'ECONNRESET' ||
        networkError?.code === 'ECONNREFUSED'
      ) {
        return true;
      }

      // Don't retry on constraint violations or other logical errors
      return false;
    },
  });
}

// Error context interface for better typing
interface ErrorContext {
  originalError?: string | Error;
  status?: number;
  [key: string]: unknown;
}

// Enhanced error handling with context
export class AppError extends Error {
  public code: string;
  public context: ErrorContext;
  public retryable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    context: ErrorContext = {},
    retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.retryable = retryable;
  }

  toApiError(): ApiErrorResponse {
    return createErrorResponse(this.message, this.code, this.context);
  }
}

// Error factory functions
export function createDatabaseError(
  message: string,
  originalError?: Error | string,
): AppError {
  return new AppError(
    message,
    'DATABASE_ERROR',
    {
      originalError:
        typeof originalError === 'string'
          ? originalError
          : originalError?.message || originalError,
    },
    true, // Database errors are often retryable
  );
}

export function createGoogleCalendarError(
  message: string,
  originalError?: RetryableError,
): AppError {
  const retryable = originalError
    ? DEFAULT_RETRY_OPTIONS.retryCondition?.(originalError) || false
    : false;
  return new AppError(
    message,
    'GOOGLE_CALENDAR_ERROR',
    {
      originalError:
        typeof originalError === 'string'
          ? originalError
          : originalError?.message || String(originalError),
      status: (originalError as HttpError)?.response?.status,
    },
    retryable,
  );
}

export function createValidationError(
  message: string,
  details?: ErrorContext,
): AppError {
  return new AppError(
    message,
    'VALIDATION_ERROR',
    details || {},
    false, // Validation errors are not retryable
  );
}

export function createAuthenticationError(message: string): AppError {
  return new AppError(
    message,
    'AUTHENTICATION_ERROR',
    {},
    false, // Auth errors are not retryable
  );
}
