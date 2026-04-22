import { getConfig } from './config.js';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  errors: string[];
  code: number;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  apiUrlOverride?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function redactForLog(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of ['password', 'token', 'Authorization', 'authorization']) {
    if (key in clone) clone[key] = '***';
  }
  if (clone.data && typeof clone.data === 'object') {
    clone.data = redactForLog(clone.data);
  }
  return clone;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const isVerbose = process.env.WMS_VERBOSE === 'true';
  const { apiUrl: configUrl, token } = getConfig();
  const apiUrl = options.apiUrlOverride ?? configUrl;
  const url = `${apiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  if (isVerbose) {
    console.error(`→ ${fetchOptions.method} ${url}`);
    if (options.body !== undefined) {
      console.error(`  Body: ${JSON.stringify(redactForLog(options.body), null, 2)}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    throw new ApiError(
      `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      0
    );
  }

  // Check status-based conditions before JSON parse, so upstream proxies that
  // return non-JSON 429/401 bodies still produce the friendly message.
  if (response.status === 429) {
    throw new ApiError('Rate limit exceeded — slow down and retry.', 429);
  }
  if (response.status === 401) {
    throw new ApiError("Session expired — run 'wms login'", 401);
  }

  let envelope: ApiEnvelope<T> | null = null;
  const rawText = await response.text();
  if (rawText) {
    try {
      envelope = JSON.parse(rawText) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(
        `Invalid JSON response (HTTP ${response.status}): ${rawText.slice(0, 200)}`,
        response.status
      );
    }
  }

  if (isVerbose) {
    console.error(`← HTTP ${response.status}`);
    if (envelope) {
      console.error(`  Response: ${JSON.stringify(redactForLog(envelope), null, 2)}`);
    }
  }

  if (!envelope) {
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }
    return undefined as T;
  }

  if (!envelope.success) {
    throw new ApiError(
      envelope.message || 'API request failed',
      envelope.code || response.status,
      envelope.errors || []
    );
  }

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
  }

  return envelope.data;
}
