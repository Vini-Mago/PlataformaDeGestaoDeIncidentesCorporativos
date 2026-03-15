import type { AuditEntry } from "../../domain/entities/audit-entry.entity";

export interface CreateAuditEntryInput {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditEntryListFilters {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
}

export interface IAuditEntryRepository {
  create(input: CreateAuditEntryInput): Promise<AuditEntry>;
  findById(id: string): Promise<AuditEntry | null>;
  list(filters?: AuditEntryListFilters): Promise<AuditEntry[]>;
}
