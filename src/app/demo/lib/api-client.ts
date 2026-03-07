/**
 * Typed fetch wrapper for the Calbrew B2B API demo page.
 * Records request/response metadata for display.
 */

export interface ApiRequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface ApiResponseInfo {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
}

export interface ApiCallResult {
  request: ApiRequestInfo;
  response: ApiResponseInfo;
}

function extractHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (
      key.startsWith('x-ratelimit') ||
      key === 'retry-after' ||
      key === 'content-type'
    ) {
      result[key] = value;
    }
  });
  return result;
}

export async function callApi(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey?: string;
    queryParams?: Record<string, string>;
  } = {},
): Promise<ApiCallResult> {
  const { method = 'GET', body, apiKey, queryParams } = options;

  let url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint}`;

  if (queryParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const requestInfo: ApiRequestInfo = {
    method,
    url,
    headers: { ...headers },
    ...(body !== undefined && { body }),
  };

  const start = performance.now();

  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    const durationMs = Math.round(performance.now() - start);
    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      responseBody = { _error: 'Could not parse response as JSON' };
    }

    return {
      request: requestInfo,
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: extractHeaders(res.headers),
        body: responseBody,
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    return {
      request: requestInfo,
      response: {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: {
          _error:
            error instanceof Error ? error.message : 'Unknown network error',
        },
        durationMs,
      },
    };
  }
}
