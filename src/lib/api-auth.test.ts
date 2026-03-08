import { describe, it, expect } from 'vitest';
import {
  generateApiKey,
  hashString,
  hasScope,
  hasAnyScope,
  hasAllScopes,
  AuthenticatedClient,
  ApiClient,
  ApiKey,
} from './api-auth';

describe('api-auth', () => {
  describe('hashString', () => {
    it('should generate consistent SHA-256 hashes', () => {
      const input = 'test-string';
      const hash1 = hashString(input);
      const hash2 = hashString(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashString('input1');
      const hash2 = hashString('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate a valid hex string', () => {
      const hash = hashString('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateApiKey', () => {
    it('should generate a live API key with correct prefix', () => {
      const { plaintextKey, keyHash, keyPrefix } = generateApiKey(false);

      expect(plaintextKey).toMatch(/^cb_live_[A-Za-z0-9_-]{32}$/);
      expect(keyPrefix).toBe(plaintextKey.slice(0, 12));
      expect(keyHash).toHaveLength(64);
    });

    it('should generate a test API key with correct prefix', () => {
      const { plaintextKey, keyHash, keyPrefix } = generateApiKey(true);

      expect(plaintextKey).toMatch(/^cb_test_[A-Za-z0-9_-]{32}$/);
      expect(keyPrefix).toBe(plaintextKey.slice(0, 12));
      expect(keyHash).toHaveLength(64);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateApiKey(false);
      const key2 = generateApiKey(false);

      expect(key1.plaintextKey).not.toBe(key2.plaintextKey);
      expect(key1.keyHash).not.toBe(key2.keyHash);
    });

    it('should generate hash that matches the plaintext key', () => {
      const { plaintextKey, keyHash } = generateApiKey(false);
      const computedHash = hashString(plaintextKey);

      expect(keyHash).toBe(computedHash);
    });
  });

  describe('scope checking', () => {
    const mockClient: ApiClient = {
      id: 'client-123',
      name: 'Test Client',
      tier: 'premium',
      contact_email: 'test@example.com',
      rate_limit_per_minute: 60,
      rate_limit_per_day: 10000,
      is_active: true,
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockKey: ApiKey = {
      id: 'key-123',
      client_id: 'client-123',
      key_hash: 'hash',
      key_prefix: 'cb_live_xxxx',
      name: 'Test Key',
      scopes: ['dates:read', 'contacts:read', 'contacts:write'],
      last_used_at: null,
      expires_at: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const auth: AuthenticatedClient = {
      client: mockClient,
      key: mockKey,
    };

    describe('hasScope', () => {
      it('should return true for an existing scope', () => {
        expect(hasScope(auth, 'dates:read')).toBe(true);
        expect(hasScope(auth, 'contacts:read')).toBe(true);
        expect(hasScope(auth, 'contacts:write')).toBe(true);
      });

      it('should return false for a missing scope', () => {
        expect(hasScope(auth, 'webhooks:read')).toBe(false);
        expect(hasScope(auth, 'webhooks:write')).toBe(false);
      });
    });

    describe('hasAnyScope', () => {
      it('should return true if any scope matches', () => {
        expect(hasAnyScope(auth, ['dates:read', 'webhooks:read'])).toBe(true);
        expect(hasAnyScope(auth, ['webhooks:read', 'contacts:write'])).toBe(
          true,
        );
      });

      it('should return false if no scopes match', () => {
        expect(hasAnyScope(auth, ['webhooks:read', 'webhooks:write'])).toBe(
          false,
        );
      });

      it('should return false for empty scopes array', () => {
        expect(hasAnyScope(auth, [])).toBe(false);
      });
    });

    describe('hasAllScopes', () => {
      it('should return true if all scopes match', () => {
        expect(hasAllScopes(auth, ['dates:read'])).toBe(true);
        expect(hasAllScopes(auth, ['dates:read', 'contacts:read'])).toBe(true);
        expect(
          hasAllScopes(auth, ['dates:read', 'contacts:read', 'contacts:write']),
        ).toBe(true);
      });

      it('should return false if any scope is missing', () => {
        expect(hasAllScopes(auth, ['dates:read', 'webhooks:read'])).toBe(false);
        expect(
          hasAllScopes(auth, ['dates:read', 'contacts:read', 'webhooks:write']),
        ).toBe(false);
      });

      it('should return true for empty scopes array', () => {
        expect(hasAllScopes(auth, [])).toBe(true);
      });
    });
  });
});
