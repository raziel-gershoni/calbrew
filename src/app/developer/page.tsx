'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useDeveloperClients } from '@/hooks/useDeveloperClients';
import { usePersonalTokens } from '@/hooks/usePersonalTokens';
import { ApiKey } from '@/lib/api-auth';

const AVAILABLE_SCOPES = [
  'dates:read',
  'contacts:read',
  'contacts:write',
  'webhooks:read',
  'webhooks:write',
] as const;

interface ClientKeysState {
  keys: Omit<ApiKey, 'key_hash'>[];
  isLoading: boolean;
}

export default function DeveloperPage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      signOut({ callbackUrl: '/' });
    }
  }, [session]);

  const {
    clients,
    isLoading,
    isCreating,
    createClient,
    fetchKeys,
    createKey,
    revokeKey,
    deleteClient,
  } = useDeveloperClients();

  const {
    tokens,
    isLoading: isLoadingTokens,
    isCreating: isCreatingToken,
    createToken,
    revokeToken,
  } = usePersonalTokens();

  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>([
    'events:read',
    'dates:read',
  ]);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<string | null>(
    null,
  );
  const [copiedToken, setCopiedToken] = useState(false);

  const [newClientName, setNewClientName] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientKeys, setClientKeys] = useState<Record<string, ClientKeysState>>(
    {},
  );
  const [newKeyForm, setNewKeyForm] = useState<{
    clientId: string;
    name: string;
    scopes: string[];
    expiresInDays: string;
  } | null>(null);
  const [revealedKey, setRevealedKey] = useState<{
    clientId: string;
    keyId: string;
    plaintextKey: string;
  } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<{
    clientId: string;
    keyId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<string | null>(
    null,
  );

  const loadKeys = useCallback(
    async (clientId: string) => {
      setClientKeys((prev) => ({
        ...prev,
        [clientId]: { keys: prev[clientId]?.keys || [], isLoading: true },
      }));
      const keys = await fetchKeys(clientId);
      setClientKeys((prev) => ({
        ...prev,
        [clientId]: { keys, isLoading: false },
      }));
    },
    [fetchKeys],
  );

  const handleToggleExpand = useCallback(
    (clientId: string) => {
      if (expandedClient === clientId) {
        setExpandedClient(null);
      } else {
        setExpandedClient(clientId);
        if (!clientKeys[clientId]) {
          loadKeys(clientId);
        }
      }
    },
    [expandedClient, clientKeys, loadKeys],
  );

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      return;
    }
    await createClient(newClientName.trim());
    setNewClientName('');
  };

  const handleCreateKey = async () => {
    if (!newKeyForm || !newKeyForm.name.trim()) {
      return;
    }
    const result = await createKey(
      newKeyForm.clientId,
      newKeyForm.name.trim(),
      newKeyForm.scopes.length > 0 ? newKeyForm.scopes : ['dates:read'],
      newKeyForm.expiresInDays
        ? parseInt(newKeyForm.expiresInDays, 10)
        : undefined,
    );
    if (result) {
      setRevealedKey({
        clientId: newKeyForm.clientId,
        keyId: result.keyId,
        plaintextKey: result.plaintextKey,
      });
      setNewKeyForm(null);
      await loadKeys(newKeyForm.clientId);
    }
  };

  const handleRevokeKey = async (clientId: string, keyId: string) => {
    const success = await revokeKey(clientId, keyId);
    if (success) {
      setConfirmRevoke(null);
      await loadKeys(clientId);
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScopeToggle = (scope: string) => {
    if (!newKeyForm) {
      return;
    }
    setNewKeyForm((prev) => {
      if (!prev) {
        return prev;
      }
      const scopes = prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope];
      return { ...prev, scopes };
    });
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
      </div>
    );
  }

  if (!session) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            {t('Sign In Required')}
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            {t('Please sign in to access the Developer Dashboard.')}
          </p>
          <div className='flex flex-col items-center gap-3'>
            <button
              onClick={() => signIn('google')}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg'
            >
              {t('Sign in with Google')}
            </button>
            <Link
              href='/'
              className='text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors'
            >
              {t('Back')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-4xl mx-auto px-4 py-8'>
        <header className='mb-8'>
          <Link
            href='/'
            className='inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-4'
          >
            <ArrowLeftIcon className='w-4 h-4' />
            {t('Back')}
          </Link>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            {t('Developer Dashboard')}
          </h1>
          <div className='mt-2 flex items-center gap-3'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {t('Manage your API clients and keys for the Calbrew B2B API.')}
            </p>
            <Link
              href='/demo'
              className='text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors whitespace-nowrap'
            >
              {t('API Explorer')} &rarr;
            </Link>
          </div>
        </header>

        {/* Create Client Form */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6'>
          <h2 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
            {t('Create API Client')}
          </h2>
          <div className='flex gap-3'>
            <input
              type='text'
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder={t('Client name (e.g. "My App")')}
              className='flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              onKeyDown={(e) => e.key === 'Enter' && handleCreateClient()}
            />
            <button
              onClick={handleCreateClient}
              disabled={isCreating || !newClientName.trim()}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isCreating ? t('Creating...') : t('Create')}
            </button>
          </div>
        </div>

        {/* One-Time Key Display */}
        {revealedKey && (
          <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-6'>
            <div className='flex items-start justify-between'>
              <div>
                <h3 className='text-sm font-semibold text-yellow-800 dark:text-yellow-200'>
                  {t('Save Your API Key')}
                </h3>
                <p className='text-xs text-yellow-700 dark:text-yellow-300 mt-1'>
                  {t(
                    'This key will not be shown again. Copy it now and store it securely.',
                  )}
                </p>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className='text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 text-lg leading-none'
              >
                &times;
              </button>
            </div>
            <div className='mt-3 flex items-center gap-2'>
              <code className='flex-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs font-mono text-yellow-900 dark:text-yellow-100 break-all select-all'>
                {revealedKey.plaintextKey}
              </code>
              <button
                onClick={() => handleCopyKey(revealedKey.plaintextKey)}
                className='px-3 py-2 text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors whitespace-nowrap'
              >
                {copied ? t('Copied!') : t('Copy')}
              </button>
            </div>
          </div>
        )}

        {/* Clients List */}
        {isLoading ? (
          <div className='flex justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
          </div>
        ) : clients.length === 0 ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            <p className='text-lg mb-2'>{t('No API clients yet')}</p>
            <p className='text-sm'>
              {t('Create your first API client above to get started.')}
            </p>
          </div>
        ) : (
          <div className='space-y-4 mb-8'>
            {clients.map((client) => (
              <div
                key={client.id}
                className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'
              >
                {/* Client Header */}
                <button
                  onClick={() => handleToggleExpand(client.id)}
                  className='w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-lg'
                >
                  <div className='flex items-center gap-3'>
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      {client.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        client.tier === 'premium'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {client.tier}
                    </span>
                    {!client.is_active && (
                      <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'>
                        inactive
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs text-gray-400 dark:text-gray-500'>
                      {new Date(client.created_at).toLocaleDateString()}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedClient === client.id ? 'rotate-180' : ''
                      }`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded: Keys Section */}
                {expandedClient === client.id && (
                  <div className='border-t border-gray-200 dark:border-gray-700 px-4 py-3'>
                    <div className='flex items-center justify-between mb-3'>
                      <h4 className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        {t('API Keys')}
                      </h4>
                      <button
                        onClick={() =>
                          setNewKeyForm({
                            clientId: client.id,
                            name: '',
                            scopes: ['dates:read'],
                            expiresInDays: '',
                          })
                        }
                        className='px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                      >
                        {t('+ New Key')}
                      </button>
                    </div>

                    {/* New Key Form */}
                    {newKeyForm && newKeyForm.clientId === client.id && (
                      <div className='bg-gray-50 dark:bg-gray-750 rounded-md p-3 mb-3 border border-gray-200 dark:border-gray-600'>
                        <div className='space-y-3'>
                          <input
                            type='text'
                            value={newKeyForm.name}
                            onChange={(e) =>
                              setNewKeyForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev,
                              )
                            }
                            placeholder={t('Key name (e.g. "Production")')}
                            className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          />
                          <div>
                            <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                              {t('Scopes')}
                            </label>
                            <div className='flex flex-wrap gap-2'>
                              {AVAILABLE_SCOPES.map((scope) => (
                                <label
                                  key={scope}
                                  className='flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer'
                                >
                                  <input
                                    type='checkbox'
                                    checked={newKeyForm.scopes.includes(scope)}
                                    onChange={() => handleScopeToggle(scope)}
                                    className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                                  />
                                  {scope}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                              {t('Expires in (days, optional)')}
                            </label>
                            <input
                              type='number'
                              value={newKeyForm.expiresInDays}
                              onChange={(e) =>
                                setNewKeyForm((prev) =>
                                  prev
                                    ? { ...prev, expiresInDays: e.target.value }
                                    : prev,
                                )
                              }
                              placeholder={t(
                                'e.g. 90 (leave empty for no expiry)',
                              )}
                              min='1'
                              max='365'
                              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                            />
                          </div>
                          <div className='flex gap-2 justify-end'>
                            <button
                              onClick={() => setNewKeyForm(null)}
                              className='px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                            >
                              {t('Cancel')}
                            </button>
                            <button
                              onClick={handleCreateKey}
                              disabled={!newKeyForm.name.trim()}
                              className='px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                              {t('Generate Key')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Keys List */}
                    {clientKeys[client.id]?.isLoading ? (
                      <div className='flex justify-center py-4'>
                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600' />
                      </div>
                    ) : !clientKeys[client.id]?.keys.length ? (
                      <p className='text-sm text-gray-500 dark:text-gray-400 py-2'>
                        {t('No API keys yet. Create one to get started.')}
                      </p>
                    ) : (
                      <div className='space-y-2'>
                        {clientKeys[client.id].keys.map((key) => (
                          <div
                            key={key.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                              key.is_active
                                ? 'bg-gray-50 dark:bg-gray-750'
                                : 'bg-gray-50 dark:bg-gray-750 opacity-50'
                            }`}
                          >
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2'>
                                <span className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                                  {key.name}
                                </span>
                                {!key.is_active && (
                                  <span className='text-xs text-red-500'>
                                    {t('revoked')}
                                  </span>
                                )}
                              </div>
                              <div className='flex items-center gap-3 mt-0.5'>
                                <code className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
                                  {key.key_prefix}...
                                </code>
                                <span className='text-xs text-gray-400 dark:text-gray-500'>
                                  {key.scopes.join(', ')}
                                </span>
                                {key.expires_at && (
                                  <span className='text-xs text-gray-400'>
                                    {t('expires')}{' '}
                                    {new Date(
                                      key.expires_at,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {key.is_active && (
                              <>
                                {confirmRevoke?.keyId === key.id ? (
                                  <div className='flex items-center gap-2'>
                                    <span className='text-xs text-red-600 dark:text-red-400'>
                                      {t('Confirm?')}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleRevokeKey(client.id, key.id)
                                      }
                                      className='px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors'
                                    >
                                      {t('Revoke')}
                                    </button>
                                    <button
                                      onClick={() => setConfirmRevoke(null)}
                                      className='px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors'
                                    >
                                      {t('Cancel')}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setConfirmRevoke({
                                        clientId: client.id,
                                        keyId: key.id,
                                      })
                                    }
                                    className='px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                                  >
                                    {t('Revoke')}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Client Details */}
                    <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
                      <div className='grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400'>
                        <div>
                          {t('Rate limit:')} {client.rate_limit_per_minute}/min
                        </div>
                        <div>
                          {t('Daily limit:')} {client.rate_limit_per_day}/day
                        </div>
                        <div>
                          {t('Client ID:')}{' '}
                          <code className='font-mono'>
                            {client.id.slice(0, 8)}...
                          </code>
                        </div>
                        <div>
                          {t('Email:')} {client.contact_email}
                        </div>
                      </div>
                      <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end'>
                        {confirmDeleteClient === client.id ? (
                          <div className='flex items-center gap-2'>
                            <span className='text-xs text-red-600 dark:text-red-400'>
                              {t(
                                'This will permanently delete the client and all its API keys.',
                              )}
                            </span>
                            <button
                              onClick={async () => {
                                await deleteClient(client.id);
                                setConfirmDeleteClient(null);
                                setExpandedClient(null);
                              }}
                              className='px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors'
                            >
                              {t('Confirm')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteClient(null)}
                              className='px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors'
                            >
                              {t('Cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteClient(client.id)}
                            className='px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                          >
                            {t('Delete Client')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Personal Access Tokens Section */}
        <div className='mt-10'>
          <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100 mb-1'>
            {t('Personal Access Tokens')}
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
            {t(
              'Tokens for accessing your own data programmatically. Unlike API keys, tokens are tied to your user account.',
            )}
          </p>

          {/* Create Token Form */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4'>
            <div className='space-y-3'>
              <div className='flex gap-3'>
                <input
                  type='text'
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder={t('Token name (e.g. "My Script")')}
                  className='flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button
                  onClick={async () => {
                    if (!newTokenName.trim() || newTokenScopes.length === 0) {
                      return;
                    }
                    const result = await createToken(
                      newTokenName.trim(),
                      newTokenScopes,
                    );
                    if (result) {
                      setRevealedToken(result.token);
                      setNewTokenName('');
                    }
                  }}
                  disabled={
                    isCreatingToken ||
                    !newTokenName.trim() ||
                    newTokenScopes.length === 0
                  }
                  className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {isCreatingToken ? t('Creating...') : t('Create Token')}
                </button>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                  {t('Scopes')}:
                </span>
                {(['events:read', 'dates:read'] as const).map((scope) => (
                  <label
                    key={scope}
                    className='flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={newTokenScopes.includes(scope)}
                      onChange={() =>
                        setNewTokenScopes((prev) =>
                          prev.includes(scope)
                            ? prev.filter((s) => s !== scope)
                            : [...prev, scope],
                        )
                      }
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* One-Time Token Display */}
          {revealedToken && (
            <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <h3 className='text-sm font-semibold text-yellow-800 dark:text-yellow-200'>
                    {t('Save Your Token')}
                  </h3>
                  <p className='text-xs text-yellow-700 dark:text-yellow-300 mt-1'>
                    {t(
                      'This token will not be shown again. Copy it now and store it securely.',
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setRevealedToken(null)}
                  className='text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 text-lg leading-none'
                >
                  &times;
                </button>
              </div>
              <div className='mt-3 flex items-center gap-2'>
                <code className='flex-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs font-mono text-yellow-900 dark:text-yellow-100 break-all select-all'>
                  {revealedToken}
                </code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(revealedToken);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className='px-3 py-2 text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors whitespace-nowrap'
                >
                  {copiedToken ? t('Copied!') : t('Copy')}
                </button>
              </div>
            </div>
          )}

          {/* Tokens List */}
          {isLoadingTokens ? (
            <div className='flex justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600' />
            </div>
          ) : tokens.length === 0 ? (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              <p className='text-sm'>
                {t('No personal tokens yet. Create one above to get started.')}
              </p>
            </div>
          ) : (
            <div className='space-y-2'>
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between'
                >
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                        {token.name}
                      </span>
                      <span className='text-xs text-gray-400 dark:text-gray-500 font-mono'>
                        {token.tokenPrefix}...
                      </span>
                    </div>
                    <div className='flex items-center gap-3 mt-0.5'>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        {token.scopes.join(', ')}
                      </span>
                      {token.lastUsedAt && (
                        <span className='text-xs text-gray-400'>
                          {t('last used')}{' '}
                          {new Date(token.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {token.expiresAt && (
                        <span className='text-xs text-gray-400'>
                          {t('expires')}{' '}
                          {new Date(token.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {confirmRevokeToken === token.id ? (
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-red-600 dark:text-red-400'>
                        {t('Confirm?')}
                      </span>
                      <button
                        onClick={async () => {
                          await revokeToken(token.id);
                          setConfirmRevokeToken(null);
                        }}
                        className='px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors'
                      >
                        {t('Revoke')}
                      </button>
                      <button
                        onClick={() => setConfirmRevokeToken(null)}
                        className='px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors'
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRevokeToken(token.id)}
                      className='px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                    >
                      {t('Revoke')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
