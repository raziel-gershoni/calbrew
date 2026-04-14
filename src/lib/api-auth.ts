/**
 * API Authentication library for third-party API services
 * Handles API key generation, validation, and OAuth2 token management
 */

import { createHash, randomBytes } from 'crypto';
import { query } from './postgres';
import * as SentryHelper from './logger/sentry';

// ==================== Types ====================

export interface ApiClient {
  id: string;
  name: string;
  tier: 'basic' | 'premium';
  contact_email: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  client_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedClient {
  client: ApiClient;
  key: ApiKey;
}

export interface PersonalAccessToken {
  id: string;
  user_id: string;
  token_hash: string;
  token_prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuthResult =
  | { type: 'api_key'; client: ApiClient; key: ApiKey }
  | { type: 'pat'; pat: PersonalAccessToken };

export interface OAuthClient {
  id: string;
  client_id: string;
  oauth_client_id: string;
  oauth_client_secret_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OAuthAccessToken {
  id: string;
  oauth_client_id: string;
  token_hash: string;
  scopes: string[];
  expires_at: string;
  created_at: string;
}

// ==================== Constants ====================

const API_KEY_PREFIX_LIVE = 'cb_live_';
const API_KEY_PREFIX_TEST = 'cb_test_';
const PAT_PREFIX = 'cb_pat_';
const API_KEY_LENGTH = 32;
const PAT_LENGTH = 32;
const OAUTH_TOKEN_LENGTH = 48;

// ==================== Hash Utilities ====================

/**
 * Hash a string using SHA-256
 */
export function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}

// ==================== API Key Management ====================

/**
 * Generate a new API key
 * Returns the plaintext key (to show to user once) and the hash (for storage)
 */
export function generateApiKey(isTestMode: boolean = false): {
  plaintextKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const prefix = isTestMode ? API_KEY_PREFIX_TEST : API_KEY_PREFIX_LIVE;
  const randomPart = generateRandomString(API_KEY_LENGTH);
  const plaintextKey = `${prefix}${randomPart}`;
  const keyHash = hashString(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, 12); // Store first 12 chars for identification

  return { plaintextKey, keyHash, keyPrefix };
}

/**
 * Validate an API key and return the authenticated client
 */
export async function validateApiKey(
  apiKey: string,
): Promise<AuthenticatedClient | null> {
  try {
    // Check format
    if (
      !apiKey.startsWith(API_KEY_PREFIX_LIVE) &&
      !apiKey.startsWith(API_KEY_PREFIX_TEST)
    ) {
      return null;
    }

    const keyHash = hashString(apiKey);

    // Look up the key in the database
    const keyResult = await query<ApiKey>(
      `SELECT ak.*, ac.id as client_id_check
       FROM api_keys ak
       JOIN api_clients ac ON ak.client_id = ac.id
       WHERE ak.key_hash = $1
         AND ak.is_active = TRUE
         AND ac.is_active = TRUE
         AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [keyHash],
    );

    if (keyResult.rows.length === 0) {
      return null;
    }

    const key = keyResult.rows[0];

    // Get the client
    const clientResult = await query<ApiClient>(
      'SELECT * FROM api_clients WHERE id = $1 AND is_active = TRUE',
      [key.client_id],
    );

    if (clientResult.rows.length === 0) {
      return null;
    }

    const client = clientResult.rows[0];

    // Update last_used_at (fire and forget)
    query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [key.id],
    ).catch((err) => {
      console.error('Failed to update last_used_at:', err);
    });

    return { client, key };
  } catch (error) {
    console.error('Error validating API key:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'validate-api-key' },
      level: 'error',
    });
    return null;
  }
}

/**
 * Create a new API key for a client
 */
export async function createApiKey(
  clientId: string,
  name: string,
  scopes: string[] = ['dates:read'],
  expiresInDays?: number,
): Promise<{ keyId: string; plaintextKey: string } | null> {
  try {
    const { plaintextKey, keyHash, keyPrefix } = generateApiKey(false);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await query<{ id: string }>(
      `INSERT INTO api_keys (client_id, key_hash, key_prefix, name, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [clientId, keyHash, keyPrefix, name, scopes, expiresAt],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return { keyId: result.rows[0].id, plaintextKey };
  } catch (error) {
    console.error('Error creating API key:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'create-api-key' },
      extra: { clientId, name },
      level: 'error',
    });
    return null;
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  clientId: string,
): Promise<boolean> {
  try {
    const result = await query(
      'UPDATE api_keys SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND client_id = $2',
      [keyId, clientId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error revoking API key:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'revoke-api-key' },
      extra: { keyId, clientId },
      level: 'error',
    });
    return false;
  }
}

// ==================== Personal Access Token Management ====================

/**
 * Generate a new PAT
 */
export function generatePAT(): {
  plaintextToken: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const randomPart = generateRandomString(PAT_LENGTH);
  const plaintextToken = `${PAT_PREFIX}${randomPart}`;
  const tokenHash = hashString(plaintextToken);
  const tokenPrefix = plaintextToken.slice(0, 12);

  return { plaintextToken, tokenHash, tokenPrefix };
}

/**
 * Validate a PAT and return auth result
 */
export async function validatePAT(token: string): Promise<AuthResult | null> {
  try {
    if (!token.startsWith(PAT_PREFIX)) {
      return null;
    }

    const tokenHash = hashString(token);

    const result = await query<PersonalAccessToken>(
      `SELECT * FROM personal_access_tokens
       WHERE token_hash = $1
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const pat = result.rows[0];

    // Update last_used_at (fire and forget)
    query(
      'UPDATE personal_access_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [pat.id],
    ).catch((err) => {
      console.error('Failed to update PAT last_used_at:', err);
    });

    return { type: 'pat', pat };
  } catch (error) {
    console.error('Error validating PAT:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'validate-pat' },
      level: 'error',
    });
    return null;
  }
}

/**
 * Create a new PAT for a user
 */
export async function createPAT(
  userId: string,
  name: string,
  scopes: string[] = ['events:read'],
  expiresInDays?: number,
): Promise<{ id: string; plaintextToken: string } | null> {
  try {
    const { plaintextToken, tokenHash, tokenPrefix } = generatePAT();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await query<{ id: string }>(
      `INSERT INTO personal_access_tokens (user_id, token_hash, token_prefix, name, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, tokenHash, tokenPrefix, name, scopes, expiresAt],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return { id: result.rows[0].id, plaintextToken };
  } catch (error) {
    console.error('Error creating PAT:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'create-pat' },
      extra: { userId, name },
      level: 'error',
    });
    return null;
  }
}

/**
 * Revoke a PAT
 */
export async function revokePAT(
  patId: string,
  userId: string,
): Promise<boolean> {
  try {
    const result = await query(
      'UPDATE personal_access_tokens SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [patId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error revoking PAT:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'revoke-pat' },
      extra: { patId, userId },
      level: 'error',
    });
    return false;
  }
}

/**
 * List PATs for a user (excludes token_hash for security)
 */
export async function listPATsByUserId(
  userId: string,
): Promise<Omit<PersonalAccessToken, 'token_hash'>[]> {
  try {
    const result = await query<PersonalAccessToken>(
      `SELECT id, user_id, token_prefix, name, scopes, last_used_at, expires_at, is_active, created_at, updated_at
       FROM personal_access_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing PATs:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'list-pats' },
      extra: { userId },
      level: 'error',
    });
    return [];
  }
}

// ==================== OAuth2 Token Management ====================

/**
 * Generate an OAuth2 access token
 */
export function generateOAuthToken(): {
  plaintextToken: string;
  tokenHash: string;
} {
  const plaintextToken = generateRandomString(OAUTH_TOKEN_LENGTH);
  const tokenHash = hashString(plaintextToken);
  return { plaintextToken, tokenHash };
}

/**
 * Validate OAuth2 client credentials and return a new access token
 */
export async function validateOAuthCredentials(
  oauthClientId: string,
  oauthClientSecret: string,
): Promise<{
  accessToken: string;
  expiresIn: number;
  scopes: string[];
} | null> {
  try {
    const secretHash = hashString(oauthClientSecret);

    // Find the OAuth client
    const oauthResult = await query<OAuthClient & { api_client_id: string }>(
      `SELECT oc.*, ac.id as api_client_id
       FROM oauth_clients oc
       JOIN api_clients ac ON oc.client_id = ac.id
       WHERE oc.oauth_client_id = $1
         AND oc.oauth_client_secret_hash = $2
         AND oc.is_active = TRUE
         AND ac.is_active = TRUE`,
      [oauthClientId, secretHash],
    );

    if (oauthResult.rows.length === 0) {
      return null;
    }

    const oauthClient = oauthResult.rows[0];

    // Generate new access token
    const { plaintextToken, tokenHash } = generateOAuthToken();
    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const scopes = ['dates:read', 'contacts:read', 'contacts:write']; // Default scopes for OAuth

    // Store the token
    await query(
      `INSERT INTO oauth_access_tokens (oauth_client_id, token_hash, scopes, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [oauthClient.id, tokenHash, scopes, expiresAt],
    );

    return {
      accessToken: plaintextToken,
      expiresIn,
      scopes,
    };
  } catch (error) {
    console.error('Error validating OAuth credentials:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'validate-oauth-credentials' },
      level: 'error',
    });
    return null;
  }
}

/**
 * Validate an OAuth2 access token
 */
export async function validateOAuthToken(
  token: string,
): Promise<AuthenticatedClient | null> {
  try {
    const tokenHash = hashString(token);

    // Find the token
    const tokenResult = await query<OAuthAccessToken>(
      `SELECT * FROM oauth_access_tokens
       WHERE token_hash = $1
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      return null;
    }

    const accessToken = tokenResult.rows[0];

    // Get the OAuth client
    const oauthResult = await query<OAuthClient>(
      'SELECT * FROM oauth_clients WHERE id = $1 AND is_active = TRUE',
      [accessToken.oauth_client_id],
    );

    if (oauthResult.rows.length === 0) {
      return null;
    }

    // Get the API client
    const clientResult = await query<ApiClient>(
      'SELECT * FROM api_clients WHERE id = $1 AND is_active = TRUE',
      [oauthResult.rows[0].client_id],
    );

    if (clientResult.rows.length === 0) {
      return null;
    }

    // Create a synthetic API key for the authenticated client
    const syntheticKey: ApiKey = {
      id: accessToken.id,
      client_id: clientResult.rows[0].id,
      key_hash: tokenHash,
      key_prefix: 'oauth_',
      name: 'OAuth Access Token',
      scopes: accessToken.scopes,
      last_used_at: null,
      expires_at: accessToken.expires_at,
      is_active: true,
      created_at: accessToken.created_at,
      updated_at: accessToken.created_at,
    };

    return {
      client: clientResult.rows[0],
      key: syntheticKey,
    };
  } catch (error) {
    console.error('Error validating OAuth token:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'validate-oauth-token' },
      level: 'error',
    });
    return null;
  }
}

// ==================== Unified Authentication ====================

/**
 * Authenticate a request using API key, PAT, or OAuth token
 * Extracts the token from the Authorization header
 */
export async function authenticateRequest(
  authHeader: string | null,
): Promise<AuthResult | null> {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  // Check if it's a PAT
  if (token.startsWith(PAT_PREFIX)) {
    return validatePAT(token);
  }

  // Check if it's an API key (starts with cb_live_ or cb_test_)
  if (token.startsWith('cb_live_') || token.startsWith('cb_test_')) {
    const client = await validateApiKey(token);
    return client ? { type: 'api_key', ...client } : null;
  }

  // Otherwise, try OAuth token
  const oauthClient = await validateOAuthToken(token);
  return oauthClient ? { type: 'api_key', ...oauthClient } : null;
}

// ==================== Scope Checking ====================

/**
 * Get scopes from an auth result
 */
function getScopes(auth: AuthResult): string[] {
  return auth.type === 'api_key' ? auth.key.scopes : auth.pat.scopes;
}

/**
 * Check if the authenticated entity has the required scope
 */
export function hasScope(auth: AuthResult, scope: string): boolean {
  return getScopes(auth).includes(scope);
}

/**
 * Check if the authenticated entity has any of the required scopes
 */
export function hasAnyScope(auth: AuthResult, scopes: string[]): boolean {
  return scopes.some((scope) => getScopes(auth).includes(scope));
}

/**
 * Check if the authenticated entity has all of the required scopes
 */
export function hasAllScopes(auth: AuthResult, scopes: string[]): boolean {
  return scopes.every((scope) => getScopes(auth).includes(scope));
}

// ==================== API Client Management ====================

/**
 * Create a new API client
 */
export async function createApiClient(data: {
  name: string;
  tier?: 'basic' | 'premium';
  contactEmail: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  userId?: string;
}): Promise<ApiClient | null> {
  try {
    const tier = data.tier || 'basic';
    const rateLimitPerMinute =
      data.rateLimitPerMinute || (tier === 'premium' ? 300 : 60);
    const rateLimitPerDay =
      data.rateLimitPerDay || (tier === 'premium' ? 100000 : 10000);

    const result = await query<ApiClient>(
      `INSERT INTO api_clients (name, tier, contact_email, rate_limit_per_minute, rate_limit_per_day, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        tier,
        data.contactEmail,
        rateLimitPerMinute,
        rateLimitPerDay,
        data.userId || null,
      ],
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating API client:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'create-api-client' },
      extra: { name: data.name },
      level: 'error',
    });
    return null;
  }
}

/**
 * Get an API client by ID
 */
export async function getApiClient(
  clientId: string,
): Promise<ApiClient | null> {
  try {
    const result = await query<ApiClient>(
      'SELECT * FROM api_clients WHERE id = $1',
      [clientId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting API client:', error);
    return null;
  }
}

/**
 * Create OAuth credentials for a client
 */
export async function createOAuthCredentials(
  clientId: string,
): Promise<{ oauthClientId: string; oauthClientSecret: string } | null> {
  try {
    const oauthClientId = `calbrew_${generateRandomString(16)}`;
    const oauthClientSecret = generateRandomString(32);
    const secretHash = hashString(oauthClientSecret);

    await query(
      `INSERT INTO oauth_clients (client_id, oauth_client_id, oauth_client_secret_hash)
       VALUES ($1, $2, $3)`,
      [clientId, oauthClientId, secretHash],
    );

    return { oauthClientId, oauthClientSecret };
  } catch (error) {
    console.error('Error creating OAuth credentials:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'create-oauth-credentials' },
      extra: { clientId },
      level: 'error',
    });
    return null;
  }
}

/**
 * List API clients belonging to a specific user
 */
export async function listApiClientsByUserId(
  userId: string,
): Promise<ApiClient[]> {
  try {
    const result = await query<ApiClient>(
      'SELECT * FROM api_clients WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing API clients by user:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'list-clients-by-user' },
      extra: { userId },
      level: 'error',
    });
    return [];
  }
}

/**
 * List all API clients (admin use)
 */
export async function listAllApiClients(): Promise<ApiClient[]> {
  try {
    const result = await query<ApiClient>(
      'SELECT * FROM api_clients ORDER BY created_at DESC',
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing all API clients:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'list-all-clients' },
      level: 'error',
    });
    return [];
  }
}

/**
 * List API keys for a specific client (excludes key_hash for security)
 */
export async function listApiKeysByClientId(
  clientId: string,
): Promise<Omit<ApiKey, 'key_hash'>[]> {
  try {
    const result = await query<ApiKey>(
      `SELECT id, client_id, key_prefix, name, scopes, last_used_at, expires_at, is_active, created_at, updated_at
       FROM api_keys WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId],
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing API keys by client:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'list-keys-by-client' },
      extra: { clientId },
      level: 'error',
    });
    return [];
  }
}

/**
 * Update an API client (admin use: tier, rate limits, active status)
 */
export async function updateApiClient(
  clientId: string,
  data: {
    tier?: 'basic' | 'premium';
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    isActive?: boolean;
  },
): Promise<ApiClient | null> {
  try {
    const setClauses: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (data.tier !== undefined) {
      setClauses.push(`tier = $${paramIndex++}`);
      values.push(data.tier);
    }
    if (data.rateLimitPerMinute !== undefined) {
      setClauses.push(`rate_limit_per_minute = $${paramIndex++}`);
      values.push(data.rateLimitPerMinute);
    }
    if (data.rateLimitPerDay !== undefined) {
      setClauses.push(`rate_limit_per_day = $${paramIndex++}`);
      values.push(data.rateLimitPerDay);
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(clientId);

    const result = await query<ApiClient>(
      `UPDATE api_clients SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating API client:', error);
    SentryHelper.captureException(error, {
      tags: { module: 'api-auth', operation: 'update-api-client' },
      extra: { clientId },
      level: 'error',
    });
    return null;
  }
}

/**
 * Verify that a client belongs to a specific user
 */
export async function verifyClientOwnership(
  clientId: string,
  userId: string,
): Promise<boolean> {
  try {
    const result = await query<{ id: string }>(
      'SELECT id FROM api_clients WHERE id = $1 AND user_id = $2',
      [clientId, userId],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying client ownership:', error);
    return false;
  }
}
