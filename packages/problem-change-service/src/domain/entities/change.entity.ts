export type ChangeType = "Standard" | "Normal" | "Emergency";
export type ChangeRisk = "Low" | "Medium" | "High";

export type ChangeStatus =
  | "Draft"
  | "Submitted"
  | "InApproval"
  | "Approved"
  | "Rejected"
  | "Scheduled"
  | "InProgress"
  | "Completed"
  | "Rollback";

export interface Change {
  id: string;
  title: string;
  description: string;
  justification: string;
  changeType: ChangeType;
  risk: ChangeRisk;
  status: ChangeStatus;
  windowStart: Date | null;
  windowEnd: Date | null;
  rollbackPlan: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export const VALID_CHANGE_TYPES: ChangeType[] = ["Standard", "Normal", "Emergency"];
export const VALID_CHANGE_RISKS: ChangeRisk[] = ["Low", "Medium", "High"];
export const VALID_CHANGE_STATUSES: ChangeStatus[] = [
  "Draft",
  "Submitted",
  "InApproval",
  "Approved",
  "Rejected",
  "Scheduled",
  "InProgress",
  "Completed",
  "Rollback",
];
