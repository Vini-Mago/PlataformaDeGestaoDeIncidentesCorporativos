import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { CreateEscalationRuleDto } from "../dtos/create-escalation-rule.dto";
import { InvalidTicketTypeError } from "../errors";
import { VALID_TICKET_TYPES } from "../../domain/entities/escalation-rule.entity";

export class CreateEscalationRuleUseCase {
  constructor(private readonly escalationRuleRepository: IEscalationRuleRepository) {}

  async execute(dto: CreateEscalationRuleDto) {
    const ticketType = dto.ticketType;
    if (!VALID_TICKET_TYPES.includes(ticketType as "incident" | "request")) {
      throw new InvalidTicketTypeError(ticketType);
    }
    return this.escalationRuleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      ticketType: ticketType as "incident" | "request",
      conditionType: dto.conditionType,
      conditionValue: dto.conditionValue,
      actions: dto.actions,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
    });
  }
}
