import type { IEscalationRuleRepository, EscalationRuleListFilters } from "../ports/escalation-rule-repository.port";
import { InvalidTicketTypeError } from "../errors";
import { VALID_TICKET_TYPES } from "../../domain/entities/escalation-rule.entity";

export function parseTicketTypeFilter(value: unknown): "incident" | "request" | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).toLowerCase();
  if (s === "incident" || s === "request") return s;
  return undefined;
}

export function parseTicketTypeFilterOrThrow(value: unknown): "incident" | "request" | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value);
  if (VALID_TICKET_TYPES.includes(s as "incident" | "request")) return s as "incident" | "request";
  throw new InvalidTicketTypeError(s);
}

export class ListEscalationRulesUseCase {
  constructor(private readonly escalationRuleRepository: IEscalationRuleRepository) {}

  async execute(filters: { ticketType?: "incident" | "request"; isActive?: boolean }) {
    const listFilters: EscalationRuleListFilters = {
      ...(filters.ticketType && { ticketType: filters.ticketType }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };
    return this.escalationRuleRepository.list(listFilters);
  }
}
