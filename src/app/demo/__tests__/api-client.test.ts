import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callApi } from '../lib/api-client';

describe('callApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends GET request with correct URL', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ status: 'healthy' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await callApi('/health');

    expect(fetch).toHaveBeenCalledWith('/api/v1/health', {
      method: 'GET',
      headers: {},
    });
    expect(result.request.method).toBe('GET');
    expect(result.request.url).toBe('/api/v1/health');
    expect(result.response.status).toBe(200);
    expect(result.response.body).toEqual({ status: 'healthy' });
  });

  it('sends POST request with body and Authorization header', async () => {
    const body = {
      conversions: [{ from: 'gregorian', to: 'hebrew', date: '2026-03-15' }],
    };
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ success: true }),
      headers: new Headers({ 'content-type': 'application/json' }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await callApi('/dates/convert', {
      method: 'POST',
      body,
      apiKey: 'cb_test_abc123',
    });

    expect(fetch).toHaveBeenCalledWith('/api/v1/dates/convert', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer cb_test_abc123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    expect(result.request.headers['Authorization']).toBe(
      'Bearer cb_test_abc123',
    );
    expect(result.request.body).toEqual(body);
  });

  it('appends query params to URL', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ holidays: [] }),
      headers: new Headers(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await callApi('/dates/holidays', {
      apiKey: 'cb_test_key',
      queryParams: { startDate: '2026-03-01', endDate: '2026-04-30' },
    });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain('startDate=2026-03-01');
    expect(calledUrl).toContain('endDate=2026-04-30');
  });

  it('skips empty query params', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      headers: new Headers(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await callApi('/contacts', {
      apiKey: 'cb_test_key',
      queryParams: { limit: '10', offset: '' },
    });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).not.toContain('offset');
  });

  it('records timing information', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      headers: new Headers(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await callApi('/health');

    expect(typeof result.response.durationMs).toBe('number');
    expect(result.response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Failed to fetch'),
    );

    const result = await callApi('/health');

    expect(result.response.status).toBe(0);
    expect(result.response.statusText).toBe('Network Error');
    expect(result.response.body).toEqual({ _error: 'Failed to fetch' });
  });

  it('handles non-JSON responses', async () => {
    const mockResponse = {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('not json')),
      headers: new Headers(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await callApi('/health');

    expect(result.response.status).toBe(502);
    expect(result.response.body).toEqual({
      _error: 'Could not parse response as JSON',
    });
  });

  it('extracts rate limit headers from response', async () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'x-ratelimit-limit-minute': '60',
      'x-ratelimit-remaining-minute': '59',
      'x-ratelimit-reset': '1710000000',
    });
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      headers,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await callApi('/health');

    expect(result.response.headers['x-ratelimit-limit-minute']).toBe('60');
    expect(result.response.headers['x-ratelimit-remaining-minute']).toBe('59');
    expect(result.response.headers['content-type']).toBe('application/json');
  });
});
