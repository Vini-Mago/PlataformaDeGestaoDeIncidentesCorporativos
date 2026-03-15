import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetEscalationRuleUseCase } from "./get-escalation-rule.use-case";
import { EscalationRuleNotFoundError } from "../errors";
import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { EscalationRule } from "../../domain/entities/escalation-rule.entity";

describe("GetEscalationRuleUseCase", () => {
  let escalationRuleRepository: IEscalationRuleRepository;
  const ruleId = "11111111-1111-1111-1111-111111111111";
  const mockRule: EscalationRule = {
    id: ruleId,
    name: "Rule",
    description: null,
    ticketType: "incident",
    conditionType: "criticality",
    conditionValue: "Critical",
    actions: ["notify_manager"],
    priority: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    escalationRuleRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockRule),
      list: vi.fn(),
    };
  });

  it("returns rule when it exists", async () => {
    const useCase = new GetEscalationRuleUseCase(escalationRuleRepository);
    const result = await useCase.execute(ruleId);
    expect(result).toEqual(mockRule);
    expect(escalationRuleRepository.findById).toHaveBeenCalledWith(ruleId);
  });

  it("throws EscalationRuleNotFoundError when rule does not exist", async () => {
    vi.mocked(escalationRuleRepository.findById).mockResolvedValue(null);
    const useCase = new GetEscalationRuleUseCase(escalationRuleRepository);
    const missingId = "00000000-0000-0000-0000-000000000000";

    await expect(useCase.execute(missingId)).rejects.toThrow(EscalationRuleNotFoundError);
    await expect(useCase.execute(missingId)).rejects.toThrow(`Escalation rule not found: ${missingId}`);
  });
});
