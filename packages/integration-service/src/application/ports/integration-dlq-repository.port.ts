export type IntegrationDlqStatus = "pending" | "reprocessed" | "all";

export interface IntegrationDlqRecord {
  id: string;
  eventName: string;
  payload: object;
  errorMessage: string;
  reprocessedAt: Date | null;
  createdAt: Date;
}

export interface ListIntegrationDlqInput {
  status?: IntegrationDlqStatus;
  limit?: number;
}

export interface IIntegrationDlqRepository {
  list(input?: ListIntegrationDlqInput): Promise<IntegrationDlqRecord[]>;
  findById(id: string): Promise<IntegrationDlqRecord | null>;
  markReprocessed(id: string, reprocessedAt: Date): Promise<IntegrationDlqRecord>;
}
