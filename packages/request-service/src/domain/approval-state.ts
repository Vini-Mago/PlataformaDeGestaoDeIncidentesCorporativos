import type { ServiceCatalogItem } from "./entities/service-catalog-item.entity";

export type ServiceRequestApprovalState =
  | { mode: "sequential"; step: number }
  | { mode: "parallel"; roles: string[] };

export function initialApprovalStateForCatalog(item: ServiceCatalogItem): Record<string, unknown> | null {
  if (item.approvalFlow === "sequential") {
    return { mode: "sequential", step: 0 };
  }
  if (item.approvalFlow === "parallel") {
    return { mode: "parallel", roles: [] };
  }
  return null;
}

export function readSequentialStep(raw: unknown): number {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.mode === "sequential" && typeof o.step === "number" && Number.isInteger(o.step) && o.step >= 0) {
      return o.step;
    }
  }
  return 0;
}

export function readParallelApprovedRoles(raw: unknown): string[] {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.mode === "parallel" && Array.isArray(o.roles)) {
      return o.roles.filter((r): r is string => typeof r === "string");
    }
  }
  return [];
}

export function uniqueApproverRoles(approverRoleIds: string[]): string[] {
  return [...new Set(approverRoleIds)];
}
