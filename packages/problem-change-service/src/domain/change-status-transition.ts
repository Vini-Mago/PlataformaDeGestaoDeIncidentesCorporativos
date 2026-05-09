import type { ChangeRisk, ChangeStatus } from "./entities/change.entity";

export interface ChangeCabPolicy {
  /** Quando true (predefinição), mudança High não pode ir direto de Submitted para Approved (obriga InApproval / CAB). */
  cabHighRiskRequiresApprovalPath: boolean;
}

/** Destinos permitidos a partir de `from`, tendo em conta risco e política CAB. */
export function allowedChangeStatusTargets(
  from: ChangeStatus,
  risk: ChangeRisk,
  policy: ChangeCabPolicy
): ChangeStatus[] {
  switch (from) {
    case "Draft":
      return ["Submitted"];
    case "Submitted": {
      const next: ChangeStatus[] = ["InApproval", "Rejected"];
      const allowFastApprove =
        !policy.cabHighRiskRequiresApprovalPath || risk !== "High";
      if (allowFastApprove) {
        next.push("Approved");
      }
      return next;
    }
    case "InApproval":
      return ["Approved", "Rejected"];
    case "Approved":
      return ["Scheduled"];
    case "Scheduled":
      return ["InProgress"];
    case "InProgress":
      return ["Completed", "Rollback"];
    case "Rejected":
      return ["Draft"];
    case "Completed":
    case "Rollback":
      return [];
    default:
      return [];
  }
}

export function canTransitionChangeStatus(
  from: ChangeStatus,
  to: ChangeStatus,
  risk: ChangeRisk,
  policy: ChangeCabPolicy
): boolean {
  if (from === to) {
    return true;
  }
  return allowedChangeStatusTargets(from, risk, policy).includes(to);
}
