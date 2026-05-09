import type { ChangeStatus } from "./entities/change.entity";

/** Campos de texto/tipo/risco só editáveis em rascunho. */
export function canEditChangeCoreFields(status: ChangeStatus): boolean {
  return status === "Draft";
}

const SCHEDULING_EDIT_STATUSES: ChangeStatus[] = [
  "Draft",
  "Submitted",
  "InApproval",
  "Approved",
  "Scheduled",
];

/** Janela e rollback editáveis até ao arranque da execução. */
export function canEditChangeSchedulingFields(status: ChangeStatus): boolean {
  return SCHEDULING_EDIT_STATUSES.includes(status);
}
