'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { ApiResponse } from '@/lib/validation';
import * as SentryHelper from '@/lib/logger/sentry';

export interface PersonalToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface UsePersonalTokensReturn {
  tokens: PersonalToken[];
  isLoading: boolean;
  isCreating: boolean;
  fetchTokens: () => Promise<void>;
  createToken: (
    name: string,
    scopes?: string[],
    expiresInDays?: number,
  ) => Promise<{ id: string; token: string } | null>;
  revokeToken: (tokenId: string) => Promise<boolean>;
}

export function usePersonalTokens(): UsePersonalTokensReturn {
  const { showError, showSuccess } = useToast();
  const [tokens, setTokens] = useState<PersonalToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const fetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchTokens = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      const res = await fetch('/api/user/tokens');
      const response: ApiResponse<PersonalToken[]> = await res.json();

      if (!res.ok) {
        if (response.success === false) {
          throw new Error(response.error);
        }
        throw new Error(`Failed to fetch tokens: ${res.statusText}`);
      }

      if (response.success && response.data) {
        setTokens(response.data.filter((t) => t.isActive));
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error('Error fetching personal tokens:', error);
      SentryHelper.captureException(error, {
        tags: { hook: 'usePersonalTokens', operation: 'fetch-tokens' },
        level: 'error',
      });
      showError('Failed to load personal tokens.');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [showError]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createToken = useCallback(
    async (
      name: string,
      scopes?: string[],
      expiresInDays?: number,
    ): Promise<{ id: string; token: string } | null> => {
      try {
        setIsCreating(true);
        const res = await fetch('/api/user/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, scopes, expiresInDays }),
        });
        const response: ApiResponse<{ id: string; token: string }> =
          await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to create token: ${res.statusText}`);
          }
          return null;
        }

        await fetchTokens();
        showSuccess("Token created. Copy it now — it won't be shown again.");
        return response.success ? (response.data ?? null) : null;
      } catch (error) {
        console.error('Error creating token:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'usePersonalTokens', operation: 'create-token' },
          level: 'error',
        });
        showError('Failed to create personal token.');
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [showError, showSuccess, fetchTokens],
  );

  const revokeToken = useCallback(
    async (tokenId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/user/tokens/${tokenId}`, {
          method: 'DELETE',
        });
        const response: ApiResponse = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to revoke token: ${res.statusText}`);
          }
          return false;
        }

        await fetchTokens();
        showSuccess('Token revoked successfully.');
        return true;
      } catch (error) {
        console.error('Error revoking token:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'usePersonalTokens', operation: 'revoke-token' },
          level: 'error',
        });
        showError('Failed to revoke token.');
        return false;
      }
    },
    [showError, showSuccess, fetchTokens],
  );

  return {
    tokens,
    isLoading,
    isCreating,
    fetchTokens,
    createToken,
    revokeToken,
  };
}
