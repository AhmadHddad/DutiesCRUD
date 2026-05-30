import axios, { type AxiosError } from 'axios';
import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';
import { assertNonEmptyString } from '../utils/assert';

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: {
    message?: string;
    details?: {
      latestDuty?: Duty;
    };
  };
}

export interface DutyResource {
  duty: Duty;
  etag: string;
}

export class DutyPreconditionFailedError extends Error {
  public readonly latestDuty: Duty;
  public readonly etag: string;

  public constructor(message: string, latestDuty: Duty, etag: string) {
    super(message);
    this.name = 'DutyPreconditionFailedError';
    this.latestDuty = latestDuty;
    this.etag = etag;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const DUTIES_PATH = '/api/duties';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export async function getDutyPage(query: DutyListQuery): Promise<DutyListPage> {
  const params: DutyListQuery = {
    limit: query.limit,
    offset: query.offset
  };
  const normalizedName = query.name === '' ? undefined : query.name;

  if (normalizedName) {
    params.name = normalizedName;
  }

  const response = await apiClient.get<ApiEnvelope<DutyListPage>>(DUTIES_PATH, {
    params
  });
  return response.data.data;
}

export async function createDuty(input: DutyInput): Promise<Duty> {
  const response = await apiClient.post<ApiEnvelope<Duty>>(DUTIES_PATH, input);
  return response.data.data;
}

export async function getDuty(id: string): Promise<DutyResource> {
  const response = await apiClient.get<ApiEnvelope<Duty>>(`${DUTIES_PATH}/${id}`);
  return {
    duty: response.data.data,
    etag: readEtagHeader(response.headers.etag)
  };
}

export async function updateDuty(id: string, input: DutyInput, etag: string): Promise<DutyResource> {
  try {
    const response = await apiClient.put<ApiEnvelope<Duty>>(`${DUTIES_PATH}/${id}`, input, {
      headers: {
        'If-Match': etag
      }
    });

    return {
      duty: response.data.data,
      etag: readEtagHeader(response.headers.etag)
    };
  } catch (error) {
    if (axios.isAxiosError<ApiErrorEnvelope>(error) && error.response?.status === 412) {
      const latestResource = readLatestDutyResource(error);
      if (latestResource !== null) {
        throw new DutyPreconditionFailedError(
          error.response.data?.error?.message ?? error.message,
          latestResource.duty,
          latestResource.etag
        );
      }
    }

    throw error;
  }
}

export async function deleteDuty(id: string): Promise<void> {
  await apiClient.delete(`${DUTIES_PATH}/${id}`);
}

function readEtagHeader(etag: string | undefined): string {
  assertNonEmptyString(etag, 'Duty response is missing an ETag header.');
  return etag;
}

function readLatestDutyResource(error: AxiosError<ApiErrorEnvelope>): DutyResource | null {
  const duty = error.response?.data?.error?.details?.latestDuty;
  const etag = error.response?.headers.etag;

  if (!duty || typeof etag !== 'string') {
    return null;
  }

  return { duty, etag };
}
