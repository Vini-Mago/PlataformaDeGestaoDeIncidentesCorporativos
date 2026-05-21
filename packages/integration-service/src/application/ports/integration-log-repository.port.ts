export interface CreateIntegrationLogInput {
  direction: "inbound" | "outbound";
  endpoint: string;
  httpStatus?: number | null;
  correlationId?: string | null;
  externalId?: string | null;
  payloadSummary?: object | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}

export interface IntegrationLogRecord {
  id: string;
  direction: string;
  endpoint: string;
  httpStatus: number | null;
  correlationId: string | null;
  externalId: string | null;
  payloadSummary: object | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date;
}

export interface IIntegrationLogRepository {
  create(input: CreateIntegrationLogInput): Promise<IntegrationLogRecord>;
  list(limit?: number): Promise<IntegrationLogRecord[]>;
}
