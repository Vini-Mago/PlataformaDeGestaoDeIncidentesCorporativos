/**
 * Audit entry entity — who, when, what (RF-3.1, RF-3.2).
 * Domain-only; no framework imports.
 */
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
