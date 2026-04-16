'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { ApiResponse } from '@/lib/validation';
import { ApiClient, ApiKey } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

interface UseDeveloperClientsReturn {
  clients: ApiClient[];
  isLoading: boolean;
  isCreating: boolean;
  fetchClients: () => Promise<void>;
  createClient: (name: string) => Promise<ApiClient | null>;
  fetchKeys: (clientId: string) => Promise<Omit<ApiKey, 'key_hash'>[]>;
  createKey: (
    clientId: string,
    name: string,
    scopes: string[],
    expiresInDays?: number,
  ) => Promise<{ keyId: string; plaintextKey: string } | null>;
  revokeKey: (clientId: string, keyId: string) => Promise<boolean>;
  deleteClient: (clientId: string) => Promise<boolean>;
}

export function useDeveloperClients(): UseDeveloperClientsReturn {
  const { showError, showSuccess } = useToast();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const fetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchClients = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      const res = await fetch('/api/developer/clients');
      const response: ApiResponse<ApiClient[]> = await res.json();

      if (!res.ok) {
        if (response.success === false) {
          throw new Error(response.error);
        }
        throw new Error(`Failed to fetch clients: ${res.statusText}`);
      }

      if (response.success && response.data) {
        setClients(response.data);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching developer clients:', error);
      SentryHelper.captureException(error, {
        tags: { hook: 'useDeveloperClients', operation: 'fetch-clients' },
        level: 'error',
      });
      showError('Failed to load API clients.');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [showError]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createClient = useCallback(
    async (name: string): Promise<ApiClient | null> => {
      try {
        setIsCreating(true);
        const res = await fetch('/api/developer/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const response: ApiResponse<ApiClient> = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to create client: ${res.statusText}`);
          }
          return null;
        }

        await fetchClients();
        showSuccess('API client created successfully!');
        return response.success ? (response.data ?? null) : null;
      } catch (error) {
        console.error('Error creating client:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useDeveloperClients', operation: 'create-client' },
          level: 'error',
        });
        showError('Failed to create API client.');
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [showError, showSuccess, fetchClients],
  );

  const fetchKeys = useCallback(
    async (clientId: string): Promise<Omit<ApiKey, 'key_hash'>[]> => {
      try {
        const res = await fetch(`/api/developer/clients/${clientId}/keys`);
        const response: ApiResponse<Omit<ApiKey, 'key_hash'>[]> =
          await res.json();

        if (!res.ok) {
          if (response.success === false) {
            throw new Error(response.error);
          }
          throw new Error(`Failed to fetch keys: ${res.statusText}`);
        }

        return response.success && response.data ? response.data : [];
      } catch (error) {
        console.error('Error fetching keys:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useDeveloperClients', operation: 'fetch-keys' },
          level: 'error',
        });
        showError('Failed to load API keys.');
        return [];
      }
    },
    [showError],
  );

  const createKey = useCallback(
    async (
      clientId: string,
      name: string,
      scopes: string[],
      expiresInDays?: number,
    ): Promise<{ keyId: string; plaintextKey: string } | null> => {
      try {
        const res = await fetch(`/api/developer/clients/${clientId}/keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, scopes, expiresInDays }),
        });
        const response: ApiResponse<{ keyId: string; plaintextKey: string }> =
          await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to create key: ${res.statusText}`);
          }
          return null;
        }

        showSuccess("API key created. Save it now — it won't be shown again.");
        return response.success ? (response.data ?? null) : null;
      } catch (error) {
        console.error('Error creating key:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useDeveloperClients', operation: 'create-key' },
          level: 'error',
        });
        showError('Failed to create API key.');
        return null;
      }
    },
    [showError, showSuccess],
  );

  const revokeKey = useCallback(
    async (clientId: string, keyId: string): Promise<boolean> => {
      try {
        const res = await fetch(
          `/api/developer/clients/${clientId}/keys/${keyId}`,
          { method: 'DELETE' },
        );
        const response: ApiResponse = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to revoke key: ${res.statusText}`);
          }
          return false;
        }

        showSuccess('API key revoked successfully.');
        return true;
      } catch (error) {
        console.error('Error revoking key:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useDeveloperClients', operation: 'revoke-key' },
          level: 'error',
        });
        showError('Failed to revoke API key.');
        return false;
      }
    },
    [showError, showSuccess],
  );

  const deleteClient = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/developer/clients/${clientId}`, {
          method: 'DELETE',
        });
        const response: ApiResponse = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to delete client: ${res.statusText}`);
          }
          return false;
        }

        await fetchClients();
        showSuccess('API client deleted successfully.');
        return true;
      } catch (error) {
        console.error('Error deleting client:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useDeveloperClients', operation: 'delete-client' },
          level: 'error',
        });
        showError('Failed to delete API client.');
        return false;
      }
    },
    [showError, showSuccess, fetchClients],
  );

  return {
    clients,
    isLoading,
    isCreating,
    fetchClients,
    createClient,
    fetchKeys,
    createKey,
    revokeKey,
    deleteClient,
  };
}
