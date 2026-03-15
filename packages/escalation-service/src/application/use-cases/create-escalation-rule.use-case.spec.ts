import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateEscalationRuleUseCase } from "./create-escalation-rule.use-case";
import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { EscalationRule } from "../../domain/entities/escalation-rule.entity";

describe("CreateEscalationRuleUseCase", () => {
  let escalationRuleRepository: IEscalationRuleRepository;
  const mockRule: EscalationRule = {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Critical no response",
    description: "Escalate when no first response in 15 min",
    ticketType: "incident",
    conditionType: "no_first_response_minutes",
    conditionValue: "15",
    actions: ["notify_manager", "alert"],
    priority: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    escalationRuleRepository = {
      create: vi.fn().mockResolvedValue(mockRule),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates escalation rule with required fields", async () => {
    const useCase = new CreateEscalationRuleUseCase(escalationRuleRepository);
    const dto = {
      name: "Critical no response",
      ticketType: "incident" as const,
      conditionType: "no_first_response_minutes" as const,
      conditionValue: "15",
      actions: ["notify_manager", "alert"] as const,
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockRule);
    expect(escalationRuleRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      description: null,
      ticketType: dto.ticketType,
      conditionType: dto.conditionType,
      conditionValue: dto.conditionValue,
      actions: dto.actions,
      priority: 0,
      isActive: true,
    });
  });

  it("creates escalation rule with optional fields", async () => {
    const useCase = new CreateEscalationRuleUseCase(escalationRuleRepository);
    const dto = {
      name: "SLA risk",
      description: "At 80% of deadline",
      ticketType: "request" as const,
      conditionType: "sla_risk_percent" as const,
      conditionValue: "80",
      actions: ["reassign_level2"] as const,
      priority: 5,
      isActive: false,
    };

    await useCase.execute(dto);

    expect(escalationRuleRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      description: "At 80% of deadline",
      ticketType: dto.ticketType,
      conditionType: dto.conditionType,
      conditionValue: dto.conditionValue,
      actions: dto.actions,
      priority: 5,
      isActive: false,
    });
  });
});
