'use client';

import { useState } from 'react';
import { callApi, type ApiCallResult } from '../lib/api-client';
import EndpointSection from './EndpointSection';
import RequestResponsePanel from './RequestResponsePanel';

export default function DemoHealthCheck() {
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await callApi('/health');
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EndpointSection
      method='GET'
      path='/api/v1/health'
      description='Health check (no auth required)'
      tier='free'
      defaultOpen
    >
      <button
        onClick={handleSend}
        disabled={loading}
        className='mt-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400 transition-colors'
      >
        {loading ? 'Sending...' : 'Send Request'}
      </button>
      <RequestResponsePanel result={result} loading={loading} />
    </EndpointSection>
  );
}
