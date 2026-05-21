import { bffFetchJson } from "./http";

export type IntegrationLog = {
  id: string;
  direction: string;
  endpoint: string;
  httpStatus: number | null;
  correlationId: string | null;
  externalId: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type IntegrationDlqItem = {
  id: string;
  eventName: string;
  errorMessage: string;
  reprocessedAt: string | null;
  createdAt: string;
};

export async function fetchIntegrationLogs(): Promise<IntegrationLog[]> {
  const res = await bffFetchJson<{ items: IntegrationLog[] }>("/integration/integration-logs?limit=8");
  return res.items;
}

export async function fetchIntegrationDlq(): Promise<IntegrationDlqItem[]> {
  const res = await bffFetchJson<{ items: IntegrationDlqItem[] }>("/integration/integration-dlq?status=all&limit=8");
  return res.items;
}

export async function reprocessIntegrationDlq(id: string): Promise<void> {
  await bffFetchJson(`/integration/integration-dlq/${encodeURIComponent(id)}/reprocess`, {
    method: "POST",
    body: "{}",
  });
}
