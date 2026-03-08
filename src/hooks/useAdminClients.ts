'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { ApiResponse } from '@/lib/validation';
import { ApiClient } from '@/lib/api-auth';
import * as SentryHelper from '@/lib/logger/sentry';

interface UpdateClientData {
  tier?: 'basic' | 'premium';
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  isActive?: boolean;
}

interface UseAdminClientsReturn {
  clients: ApiClient[];
  isLoading: boolean;
  isForbidden: boolean;
  updateClient: (clientId: string, data: UpdateClientData) => Promise<boolean>;
  fetchClients: () => Promise<void>;
}

export function useAdminClients(): UseAdminClientsReturn {
  const { showError, showSuccess } = useToast();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const fetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchClients = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      const res = await fetch('/api/admin/api-clients');

      if (res.status === 403) {
        setIsForbidden(true);
        setClients([]);
        return;
      }

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
      console.error('Error fetching admin clients:', error);
      SentryHelper.captureException(error, {
        tags: { hook: 'useAdminClients', operation: 'fetch-clients' },
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

  const updateClient = useCallback(
    async (clientId: string, data: UpdateClientData): Promise<boolean> => {
      try {
        const res = await fetch(`/api/admin/api-clients/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const response: ApiResponse<ApiClient> = await res.json();

        if (!res.ok) {
          if (response.success === false) {
            showError(response.error);
          } else {
            throw new Error(`Failed to update client: ${res.statusText}`);
          }
          return false;
        }

        await fetchClients();
        showSuccess('API client updated successfully!');
        return true;
      } catch (error) {
        console.error('Error updating client:', error);
        SentryHelper.captureException(error, {
          tags: { hook: 'useAdminClients', operation: 'update-client' },
          extra: { clientId },
          level: 'error',
        });
        showError('Failed to update API client.');
        return false;
      }
    },
    [showError, showSuccess, fetchClients],
  );

  return {
    clients,
    isLoading,
    isForbidden,
    updateClient,
    fetchClients,
  };
}
