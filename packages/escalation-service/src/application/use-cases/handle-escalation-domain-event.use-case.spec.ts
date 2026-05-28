import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INCIDENT_CREATED_EVENT,
  SLA_BREACH_EVENT,
  SLA_RISK_EVENT,
} from "@pgic/shared";
import { HandleEscalationDomainEventUseCase } from "./handle-escalation-domain-event.use-case";
import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { IEscalationHistoryRepository } from "../ports/escalation-history-repository.port";

describe("HandleEscalationDomainEventUseCase", () => {
  let ruleRepository: IEscalationRuleRepository;
  let historyRepository: IEscalationHistoryRepository;

  beforeEach(() => {
    ruleRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      listActiveByTicketType: vi.fn(),
    };
    historyRepository = {
      create: vi.fn(),
      existsRecent: vi.fn().mockResolvedValue(false),
    };
  });

  it("creates history for incident criticality rule", async () => {
    vi.mocked(ruleRepository.listActiveByTicketType).mockResolvedValue([
      {
        id: "rule-1",
        name: "Crit alta",
        description: null,
        ticketType: "incident",
        conditionType: "criticality",
        conditionValue: "high",
        actions: ["notify_manager"],
        priority: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const useCase = new HandleEscalationDomainEventUseCase(ruleRepository, historyRepository);

    await useCase.execute(INCIDENT_CREATED_EVENT, {
      incidentId: "11111111-1111-4111-8111-111111111111",
      criticality: "high",
    });

    expect(historyRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: "rule-1",
        ticketType: "incident",
        actionExecuted: "notify_manager",
      })
    );
  });

  it("creates history for SLA risk threshold rule", async () => {
    vi.mocked(ruleRepository.listActiveByTicketType).mockResolvedValue([
      {
        id: "rule-2",
        name: "SLA risco 80",
        description: null,
        ticketType: "incident",
        conditionType: "sla_risk_percent",
        conditionValue: "80",
        actions: ["alert"],
        priority: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const useCase = new HandleEscalationDomainEventUseCase(ruleRepository, historyRepository);

    await useCase.execute(SLA_RISK_EVENT, {
      ticketId: "11111111-1111-4111-8111-111111111111",
      ticketType: "incident",
      percentUsed: 81,
    });

    expect(historyRepository.create).toHaveBeenCalledTimes(1);
  });

  it("creates history for no_first_response_minutes when response breach arrives", async () => {
    vi.mocked(ruleRepository.listActiveByTicketType).mockResolvedValue([
      {
        id: "rule-3",
        name: "Sem primeira resposta",
        description: null,
        ticketType: "incident",
        conditionType: "no_first_response_minutes",
        conditionValue: "30",
        actions: ["reassign_level2"],
        priority: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const useCase = new HandleEscalationDomainEventUseCase(ruleRepository, historyRepository);

    await useCase.execute(SLA_BREACH_EVENT, {
      ticketId: "11111111-1111-4111-8111-111111111111",
      ticketType: "incident",
      breachType: "response",
    });

    expect(historyRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: "rule-3",
        actionExecuted: "reassign_level2",
      })
    );
  });

  it("does not duplicate when recent history exists", async () => {
    vi.mocked(ruleRepository.listActiveByTicketType).mockResolvedValue([
      {
        id: "rule-4",
        name: "SLA breach",
        description: null,
        ticketType: "incident",
        conditionType: "sla_breach",
        conditionValue: "1",
        actions: ["alert"],
        priority: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(historyRepository.existsRecent).mockResolvedValue(true);
    const useCase = new HandleEscalationDomainEventUseCase(ruleRepository, historyRepository);

    await useCase.execute(SLA_BREACH_EVENT, {
      ticketId: "11111111-1111-4111-8111-111111111111",
      ticketType: "incident",
      breachType: "resolution",
    });

    expect(historyRepository.create).not.toHaveBeenCalled();
  });
});
