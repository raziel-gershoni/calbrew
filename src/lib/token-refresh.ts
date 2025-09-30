/**
 * Token Refresh Utility
 * Handles OAuth token refresh for background services
 */

import { query } from './postgres';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Refresh an OAuth access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Token refresh failed:', data);
      return {
        success: false,
        error: data.error_description || data.error || 'Token refresh failed',
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Fall back to old refresh token if not provided
      expiresAt: Math.floor(Date.now() / 1000 + data.expires_in),
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh and update user's access token in the database
 */
export async function refreshUserToken(
  userId: string,
): Promise<TokenRefreshResult> {
  try {
    // Get user's current tokens
    const userResult = await query<{
      refresh_token: string;
      access_token: string;
    }>(
      `
      SELECT refresh_token, access_token
      FROM users
      WHERE id = $1
    `,
      [userId],
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].refresh_token) {
      return {
        success: false,
        error: 'No refresh token found for user',
      };
    }

    const { refresh_token } = userResult.rows[0];

    // Refresh the token
    const result = await refreshAccessToken(refresh_token);

    if (!result.success) {
      return result;
    }

    // Update tokens in database
    await query(
      `
      UPDATE users
      SET
        access_token = $1,
        refresh_token = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
      [result.accessToken, result.refreshToken, userId],
    );

    return result;
  } catch (error) {
    console.error('Error refreshing user token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a valid access token for a user, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  try {
    // Get user's current access token
    const userResult = await query<{
      access_token: string;
      refresh_token: string;
    }>(
      `
      SELECT access_token, refresh_token
      FROM users
      WHERE id = $1
    `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      console.error(`User ${userId} not found`);
      return null;
    }

    const { access_token, refresh_token } = userResult.rows[0];

    if (!access_token || !refresh_token) {
      console.error(`User ${userId} has no tokens`);
      return null;
    }

    // Try to use the current token first
    // If it fails, refresh it
    try {
      // Test the token by making a simple API call
      const testResponse = await fetch(
        'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' +
          access_token,
      );

      if (testResponse.ok) {
        // Token is still valid
        return access_token;
      }
    } catch {
      console.log(
        `Access token for user ${userId} appears invalid, refreshing...`,
      );
    }

    // Token is invalid or expired, refresh it
    const refreshResult = await refreshUserToken(userId);

    if (refreshResult.success && refreshResult.accessToken) {
      return refreshResult.accessToken;
    }

    console.error(
      `Failed to refresh token for user ${userId}:`,
      refreshResult.error,
    );
    return null;
  } catch (err) {
    console.error('Error getting valid access token:', err);
    return null;
  }
}
