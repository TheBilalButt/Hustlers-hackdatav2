import type { Dataset, TrustReport, BackendTrustReport } from '../types/ir';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; engine_version: string; offline_mode: boolean }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function generatePreview(dataset: Dataset, rows = 50): Promise<{
  rows: Record<string, unknown[]>;
  hash: string;
  seed: number;
}> {
  const res = await fetch(`${BASE_URL}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset, limit: rows }),
  });
  if (!res.ok) throw new Error(`Preview failed: ${res.statusText}`);
  return res.json();
}

export async function fetchTrustReport(dataset: Dataset): Promise<TrustReport> {
  const res = await fetch(`${BASE_URL}/trust-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset }),
  });
  if (!res.ok) throw new Error(`Trust report failed: ${res.statusText}`);
  return res.json();
}

export async function downloadDocumentsZip(
  kind: 'invoice' | 'statement',
  count: number = 5,
  recipe?: Dataset,
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, count, recipe }),
  });
  if (!res.ok) throw new Error(`Document generation failed: ${res.statusText}`);
  return res.blob();
}

export async function fetchTrustReportBackend(
  dataset: Dataset,
  data?: Record<string, unknown[]>,
): Promise<BackendTrustReport> {
  const res = await fetch(`${BASE_URL}/trust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe: dataset, data }),
  });
  if (!res.ok) throw new Error(`Trust report failed: ${res.statusText}`);
  return res.json();
}
