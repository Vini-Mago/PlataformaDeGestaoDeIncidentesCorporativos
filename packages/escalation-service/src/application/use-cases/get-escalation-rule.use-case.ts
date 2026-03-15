import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import { EscalationRuleNotFoundError } from "../errors";

export class GetEscalationRuleUseCase {
  constructor(private readonly escalationRuleRepository: IEscalationRuleRepository) {}

  async execute(id: string) {
    const rule = await this.escalationRuleRepository.findById(id);
    if (!rule) throw new EscalationRuleNotFoundError(id);
    return rule;
  }
}
