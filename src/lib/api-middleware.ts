/**
 * API Middleware for third-party API v1 routes
 * Provides authentication, rate limiting, scope checking, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticatedClient, hasScope } from './api-auth';
import {
  checkAllRateLimits,
  getRateLimitHeaders,
  RateLimitHeaders,
} from './api-rate-limit';
import { createErrorResponse, createSuccessResponse } from './validation';
import * as SentryHelper from './logger/sentry';

// ==================== Types ====================

export interface ApiContext {
  client: AuthenticatedClient;
  rateLimitHeaders: RateLimitHeaders;
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiContext,
) => Promise<NextResponse<T>>;

export interface ApiMiddlewareOptions {
  requiredScopes?: string[];
  requirePremiumTier?: boolean;
}

// ==================== Error Responses ====================

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    createErrorResponse('Invalid or missing API key', 'UNAUTHORIZED'),
    { status: 401 },
  );
}

function forbiddenResponse(message: string): NextResponse {
  return NextResponse.json(createErrorResponse(message, 'FORBIDDEN'), {
    status: 403,
  });
}

function rateLimitExceededResponse(
  headers: RateLimitHeaders,
  windowType: 'minute' | 'day',
): NextResponse {
  const message =
    windowType === 'minute'
      ? 'Rate limit exceeded. Please wait a minute before making more requests.'
      : 'Daily rate limit exceeded. Please try again tomorrow.';

  const response = NextResponse.json(
    createErrorResponse(message, 'RATE_LIMIT_EXCEEDED'),
    { status: 429 },
  );

  // Add rate limit headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add Retry-After header
  const resetTimestamp = parseInt(headers['X-RateLimit-Reset']);
  const retryAfter = Math.max(
    0,
    resetTimestamp - Math.floor(Date.now() / 1000),
  );
  response.headers.set('Retry-After', retryAfter.toString());

  return response;
}

// ==================== Main Middleware ====================

/**
 * Wrap an API handler with authentication, rate limiting, and error handling
 */
export function withApiMiddleware<T = unknown>(
  handler: ApiHandler<T>,
  options: ApiMiddlewareOptions = {},
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    let auth: AuthenticatedClient | null = null;

    try {
      // 1. Authenticate the request
      const authHeader = request.headers.get('Authorization');
      auth = await authenticateRequest(authHeader);

      if (!auth) {
        SentryHelper.addBreadcrumb({
          message: 'Unauthorized API request',
          category: 'api-auth',
          level: 'info',
          data: {
            endpoint: request.nextUrl.pathname,
            method: request.method,
          },
        });
        return unauthorizedResponse();
      }

      // 2. Check required scopes
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        const missingScopes = options.requiredScopes.filter(
          (scope) => !hasScope(auth!, scope),
        );

        if (missingScopes.length > 0) {
          SentryHelper.addBreadcrumb({
            message: 'API request missing required scopes',
            category: 'api-auth',
            level: 'info',
            data: {
              clientId: auth.client.id,
              missingScopes,
            },
          });
          return forbiddenResponse(
            `Missing required scopes: ${missingScopes.join(', ')}`,
          );
        }
      }

      // 3. Check tier requirements
      if (options.requirePremiumTier && auth.client.tier !== 'premium') {
        SentryHelper.addBreadcrumb({
          message: 'API request requires premium tier',
          category: 'api-auth',
          level: 'info',
          data: {
            clientId: auth.client.id,
            currentTier: auth.client.tier,
          },
        });
        return forbiddenResponse(
          'This endpoint requires a premium tier subscription',
        );
      }

      // 4. Check rate limits
      const rateLimits = await checkAllRateLimits(auth.client);
      const rateLimitHeaders = getRateLimitHeaders(
        rateLimits.minuteLimit,
        rateLimits.dayLimit,
      );

      if (!rateLimits.allowed) {
        SentryHelper.addBreadcrumb({
          message: 'API rate limit exceeded',
          category: 'api-rate-limit',
          level: 'warning',
          data: {
            clientId: auth.client.id,
            restrictedBy: rateLimits.restrictedBy,
          },
        });
        return rateLimitExceededResponse(
          rateLimitHeaders,
          rateLimits.restrictedBy!,
        );
      }

      // 5. Execute the handler
      const context: ApiContext = {
        client: auth,
        rateLimitHeaders,
      };

      const response = await handler(request, context);

      // 6. Add rate limit headers to successful responses
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('API handler error:', error);

      SentryHelper.captureException(error, {
        tags: {
          module: 'api-middleware',
          endpoint: request.nextUrl.pathname,
          method: request.method,
        },
        extra: {
          clientId: auth?.client.id,
        },
        level: 'error',
      });

      return NextResponse.json(
        createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
        { status: 500 },
      );
    }
  };
}

// ==================== Helper Functions ====================

/**
 * Create a successful JSON response with rate limit headers
 */
export function apiSuccessResponse<T>(
  data: T,
  context: ApiContext,
  message?: string,
  status: number = 200,
): NextResponse {
  const response = NextResponse.json(createSuccessResponse(data, message), {
    status,
  });

  Object.entries(context.rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Create an error JSON response with rate limit headers
 */
export function apiErrorResponse(
  error: string,
  code: string,
  context: ApiContext,
  status: number = 400,
  details?: Record<string, unknown>,
): NextResponse {
  const response = NextResponse.json(
    createErrorResponse(error, code, details),
    { status },
  );

  Object.entries(context.rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ==================== Specialized Middlewares ====================

/**
 * Middleware for Tier 1 (Basic) endpoints - dates utilities
 * Requires dates:read scope
 */
export function withTier1Middleware<T = unknown>(
  handler: ApiHandler<T>,
): (request: NextRequest) => Promise<NextResponse> {
  return withApiMiddleware(handler, {
    requiredScopes: ['dates:read'],
  });
}

/**
 * Middleware for Tier 2 (Premium) read endpoints - contacts, webhooks
 * Requires contacts:read or webhooks:read scope and premium tier
 */
export function withTier2ReadMiddleware<T = unknown>(
  handler: ApiHandler<T>,
  scope: 'contacts:read' | 'webhooks:read',
): (request: NextRequest) => Promise<NextResponse> {
  return withApiMiddleware(handler, {
    requiredScopes: [scope],
    requirePremiumTier: true,
  });
}

/**
 * Middleware for Tier 2 (Premium) write endpoints - contacts, webhooks
 * Requires contacts:write or webhooks:write scope and premium tier
 */
export function withTier2WriteMiddleware<T = unknown>(
  handler: ApiHandler<T>,
  scope: 'contacts:write' | 'webhooks:write',
): (request: NextRequest) => Promise<NextResponse> {
  return withApiMiddleware(handler, {
    requiredScopes: [scope],
    requirePremiumTier: true,
  });
}
