import type { EscalationRule } from "../../domain/entities/escalation-rule.entity";

export interface CreateEscalationRuleInput {
  name: string;
  description?: string | null;
  ticketType: "incident" | "request";
  conditionType: string;
  conditionValue: string;
  actions: string[];
  priority?: number;
  isActive?: boolean;
}

export interface EscalationRuleListFilters {
  ticketType?: "incident" | "request";
  isActive?: boolean;
}

export interface IEscalationRuleRepository {
  create(input: CreateEscalationRuleInput): Promise<EscalationRule>;
  findById(id: string): Promise<EscalationRule | null>;
  list(filters?: EscalationRuleListFilters): Promise<EscalationRule[]>;
}
