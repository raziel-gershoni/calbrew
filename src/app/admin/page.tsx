'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAdminClients } from '@/hooks/useAdminClients';
import { ApiClient } from '@/lib/api-auth';

interface EditFormState {
  tier: 'basic' | 'premium';
  rateLimitPerMinute: string;
  rateLimitPerDay: string;
  isActive: boolean;
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const { clients, isLoading, isForbidden, updateClient } = useAdminClients();

  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, EditFormState>>({});
  const [savingClient, setSavingClient] = useState<string | null>(null);

  const handleToggleExpand = (client: ApiClient) => {
    if (expandedClient === client.id) {
      setExpandedClient(null);
    } else {
      setExpandedClient(client.id);
      if (!editForms[client.id]) {
        setEditForms((prev) => ({
          ...prev,
          [client.id]: {
            tier: client.tier,
            rateLimitPerMinute: String(client.rate_limit_per_minute),
            rateLimitPerDay: String(client.rate_limit_per_day),
            isActive: client.is_active,
          },
        }));
      }
    }
  };

  const handleFormChange = (
    clientId: string,
    field: keyof EditFormState,
    value: string | boolean,
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: value },
    }));
  };

  const handleSave = async (clientId: string) => {
    const form = editForms[clientId];
    if (!form) {
      return;
    }

    setSavingClient(clientId);
    const success = await updateClient(clientId, {
      tier: form.tier,
      rateLimitPerMinute: parseInt(form.rateLimitPerMinute, 10),
      rateLimitPerDay: parseInt(form.rateLimitPerDay, 10),
      isActive: form.isActive,
    });

    if (success) {
      setExpandedClient(null);
      setEditForms((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
    }
    setSavingClient(null);
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
            Sign In Required
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Please sign in to access the Admin Dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            Access Denied
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            You do not have admin privileges.
          </p>
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
            Admin Dashboard
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            Manage all API clients, tiers, and rate limits.
          </p>
        </header>

        {isLoading ? (
          <div className='flex justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
          </div>
        ) : clients.length === 0 ? (
          <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
            <p className='text-lg mb-2'>No API clients</p>
            <p className='text-sm'>No API clients have been created yet.</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {clients.map((client) => (
              <div
                key={client.id}
                className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'
              >
                {/* Client Header */}
                <button
                  onClick={() => handleToggleExpand(client)}
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
                    {client.is_active ? (
                      <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'>
                        active
                      </span>
                    ) : (
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

                {/* Expanded: Client Details & Edit Form */}
                {expandedClient === client.id && editForms[client.id] && (
                  <div className='border-t border-gray-200 dark:border-gray-700 px-4 py-3'>
                    {/* Client Info */}
                    <div className='grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4'>
                      <div>
                        Client ID:{' '}
                        <code className='font-mono'>
                          {client.id.slice(0, 8)}...
                        </code>
                      </div>
                      <div>Email: {client.contact_email}</div>
                      <div>
                        User ID:{' '}
                        <code className='font-mono'>
                          {client.user_id
                            ? `${client.user_id.slice(0, 8)}...`
                            : 'N/A'}
                        </code>
                      </div>
                      <div>
                        Created:{' '}
                        {new Date(client.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Edit Form */}
                    <div className='bg-gray-50 dark:bg-gray-750 rounded-md p-3 border border-gray-200 dark:border-gray-600'>
                      <h4 className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3'>
                        Edit Client
                      </h4>
                      <div className='space-y-3'>
                        {/* Tier */}
                        <div>
                          <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                            Tier
                          </label>
                          <select
                            value={editForms[client.id].tier}
                            onChange={(e) =>
                              handleFormChange(
                                client.id,
                                'tier',
                                e.target.value,
                              )
                            }
                            className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          >
                            <option value='basic'>Basic</option>
                            <option value='premium'>Premium</option>
                          </select>
                        </div>

                        {/* Rate Limit Per Minute */}
                        <div>
                          <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                            Rate Limit Per Minute (1-1000)
                          </label>
                          <input
                            type='number'
                            value={editForms[client.id].rateLimitPerMinute}
                            onChange={(e) =>
                              handleFormChange(
                                client.id,
                                'rateLimitPerMinute',
                                e.target.value,
                              )
                            }
                            min='1'
                            max='1000'
                            className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          />
                        </div>

                        {/* Rate Limit Per Day */}
                        <div>
                          <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                            Rate Limit Per Day (1-1,000,000)
                          </label>
                          <input
                            type='number'
                            value={editForms[client.id].rateLimitPerDay}
                            onChange={(e) =>
                              handleFormChange(
                                client.id,
                                'rateLimitPerDay',
                                e.target.value,
                              )
                            }
                            min='1'
                            max='1000000'
                            className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          />
                        </div>

                        {/* Active Toggle */}
                        <div className='flex items-center justify-between'>
                          <label className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                            Active
                          </label>
                          <button
                            onClick={() =>
                              handleFormChange(
                                client.id,
                                'isActive',
                                !editForms[client.id].isActive,
                              )
                            }
                            className='relative'
                          >
                            <div
                              className={`block w-8 h-4 rounded-full transition-all duration-200 ${
                                editForms[client.id].isActive
                                  ? 'bg-blue-600'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            ></div>
                            <div
                              className={`absolute left-0 top-0 bg-white w-4 h-4 rounded-full transition-all duration-200 shadow ${
                                editForms[client.id].isActive
                                  ? 'translate-x-4'
                                  : 'translate-x-0'
                              }`}
                            ></div>
                          </button>
                        </div>

                        {/* Save Button */}
                        <div className='flex justify-end'>
                          <button
                            onClick={() => handleSave(client.id)}
                            disabled={savingClient === client.id}
                            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                          >
                            {savingClient === client.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
