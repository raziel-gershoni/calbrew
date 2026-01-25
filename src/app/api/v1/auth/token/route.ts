/**
 * OAuth2 Token Endpoint
 * POST /api/v1/auth/token
 *
 * Implements OAuth2 client credentials flow for enterprise clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOAuthCredentials } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body (can be form-urlencoded or JSON)
    let clientId: string | null = null;
    let clientSecret: string | null = null;
    let grantType: string | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      grantType = formData.get('grant_type') as string | null;
      clientId = formData.get('client_id') as string | null;
      clientSecret = formData.get('client_secret') as string | null;
    } else {
      const body = await request.json();
      grantType = body.grant_type;
      clientId = body.client_id;
      clientSecret = body.client_secret;
    }

    // Validate grant type
    if (grantType !== 'client_credentials') {
      return NextResponse.json(
        {
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials grant type is supported',
        },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'client_id and client_secret are required',
        },
        { status: 400 },
      );
    }

    // Validate credentials and get token
    const result = await validateOAuthCredentials(clientId, clientSecret);

    if (!result) {
      SentryHelper.addBreadcrumb({
        message: 'OAuth2 authentication failed',
        category: 'auth',
        level: 'info',
        data: { clientId },
      });

      return NextResponse.json(
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
        { status: 401 },
      );
    }

    // Return token response per OAuth2 spec
    return NextResponse.json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: result.expiresIn,
      scope: result.scopes.join(' '),
    });
  } catch (error) {
    console.error('OAuth2 token error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/auth/token',
        method: 'POST',
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
