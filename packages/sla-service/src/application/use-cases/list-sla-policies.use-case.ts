import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import type { SlaPolicyListFilters } from "../ports/sla-policy-repository.port";
import { VALID_TICKET_TYPES } from "../../domain/entities/sla-policy.entity";
import { InvalidTicketTypeError } from "../errors";

export interface ListSlaPoliciesInput {
  ticketType?: string;
  isActive?: boolean;
}

export function parseTicketTypeFilter(value: unknown): "incident" | "request" | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value);
  if (VALID_TICKET_TYPES.includes(s as "incident" | "request")) return s as "incident" | "request";
  throw new InvalidTicketTypeError(s);
}

export class ListSlaPoliciesUseCase {
  constructor(private readonly slaPolicyRepository: ISlaPolicyRepository) {}

  async execute(input: ListSlaPoliciesInput = {}) {
    const filters: SlaPolicyListFilters = {};
    if (input.ticketType !== undefined) filters.ticketType = input.ticketType as "incident" | "request";
    if (input.isActive !== undefined) filters.isActive = input.isActive;
    return this.slaPolicyRepository.list(filters);
  }
}
