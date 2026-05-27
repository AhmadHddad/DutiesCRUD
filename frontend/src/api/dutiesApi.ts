import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly status: number;

  public constructor(message: string, status: number, code = 'NETWORK_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function getDutyPage(query: DutyListQuery): Promise<DutyListPage> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset)
  });

  return request<DutyListPage>(`/api/duties?${params.toString()}`);
}

export async function createDuty(input: DutyInput): Promise<Duty> {
  return request<Duty>('/api/duties', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateDuty(id: string, input: DutyInput): Promise<Duty> {
  return request<Duty>(`/api/duties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export async function deleteDuty(id: string): Promise<void> {
  await request<void>(`/api/duties/${id}`, {
    method: 'DELETE'
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    });
  } catch {
    throw new ApiClientError('The API is unavailable. Check that the backend is running.', 0);
  }

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
  const requestId = response.headers.get('x-request-id') ?? undefined;

  try {
    const payload = (await response.json()) as unknown;

    if (isApiErrorEnvelope(payload)) {
      return new ApiClientError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.requestId
      );
    }
  } catch {
    return new ApiClientError('The API returned an unreadable error response.', response.status, 'BAD_RESPONSE', requestId);
  }

  return new ApiClientError('The API returned an unexpected error response.', response.status, 'BAD_RESPONSE', requestId);
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const error = (value as { error: unknown }).error;

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.requestId === 'string'
  );
}
