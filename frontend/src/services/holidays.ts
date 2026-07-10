import { api } from './api';

export type HolidayRecord = {
  id: number;
  name: string;
  date: string;
  description: string | null;
  created_at: string;
};

export type HolidayCreatePayload = {
  name: string;
  date: string;
  description?: string | null;
};

export type HolidayUpdatePayload = Partial<HolidayCreatePayload>;

export async function fetchHolidays() {
  const response = await api.get<HolidayRecord[]>('/holidays/');
  return response.data;
}

export async function createHoliday(payload: HolidayCreatePayload) {
  const response = await api.post<HolidayRecord>('/holidays/', payload);
  return response.data;
}

export async function updateHoliday(id: number, payload: HolidayUpdatePayload) {
  const response = await api.put<HolidayRecord>(`/holidays/${id}`, payload);
  return response.data;
}

export async function deleteHoliday(id: number) {
  await api.delete(`/holidays/${id}`);
}
