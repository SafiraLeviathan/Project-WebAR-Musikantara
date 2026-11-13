import type { InstrumentRecord } from '../types/app';

interface ApiListResponse {
  data: InstrumentRecord[];
  count: number;
}

interface ApiItemResponse {
  data: InstrumentRecord;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Permintaan API gagal (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function getInstruments(): Promise<InstrumentRecord[]> {
  const response = await fetchJson<ApiListResponse>('/api/instruments');
  return response.data;
}

export async function getInstrument(id: string): Promise<InstrumentRecord> {
  const response = await fetchJson<ApiItemResponse>(`/api/instruments/${encodeURIComponent(id)}`);
  return response.data;
}
