import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { CreateEscalationRuleDto } from "../dtos/create-escalation-rule.dto";

export class CreateEscalationRuleUseCase {
  constructor(private readonly escalationRuleRepository: IEscalationRuleRepository) {}

  async execute(dto: CreateEscalationRuleDto) {
    return this.escalationRuleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      ticketType: dto.ticketType,
      conditionType: dto.conditionType,
      conditionValue: dto.conditionValue,
      actions: dto.actions,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
    });
  }
}
