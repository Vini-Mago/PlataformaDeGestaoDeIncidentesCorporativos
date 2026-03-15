/**
 * Escalation rule entity — conditions and actions (RF-8.3).
 * Domain-only; no framework imports.
 */
export interface EscalationRule {
  id: string;
  name: string;
  description: string | null;
  ticketType: "incident" | "request";
  conditionType: ConditionType;
  conditionValue: string;
  actions: EscalationAction[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ConditionType =
  | "no_first_response_minutes"
  | "sla_risk_percent"
  | "criticality";

export type EscalationAction =
  | "notify_manager"
  | "reassign_level2"
  | "change_priority"
  | "alert";

export const VALID_TICKET_TYPES = ["incident", "request"] as const;
export const VALID_CONDITION_TYPES: ConditionType[] = [
  "no_first_response_minutes",
  "sla_risk_percent",
  "criticality",
];
export const VALID_ACTIONS: EscalationAction[] = [
  "notify_manager",
  "reassign_level2",
  "change_priority",
  "alert",
];
