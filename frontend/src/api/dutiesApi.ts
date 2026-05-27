import axios from 'axios';
import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

interface ApiEnvelope<T> {
  data: T;
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
  const response = await apiClient.get<ApiEnvelope<DutyListPage>>(DUTIES_PATH, {
    params: {
      limit: query.limit,
      offset: query.offset
    }
  });
  return response.data.data;
}

export async function createDuty(input: DutyInput): Promise<Duty> {
  const response = await apiClient.post<ApiEnvelope<Duty>>(DUTIES_PATH, input);
  return response.data.data;
}

export async function updateDuty(id: string, input: DutyInput): Promise<Duty> {
  const response = await apiClient.put<ApiEnvelope<Duty>>(`${DUTIES_PATH}/${id}`, input);
  return response.data.data;
}

export async function deleteDuty(id: string): Promise<void> {
  await apiClient.delete(`${DUTIES_PATH}/${id}`);
}
