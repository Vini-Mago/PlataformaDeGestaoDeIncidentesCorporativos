import {
  INCIDENT_CREATED_EVENT,
  SLA_BREACH_EVENT,
  SLA_RISK_EVENT,
} from "@pgic/shared";
import type { EscalationRule } from "../../domain/entities/escalation-rule.entity";
import type { IEscalationRuleRepository } from "../ports/escalation-rule-repository.port";
import type { IEscalationHistoryRepository } from "../ports/escalation-history-repository.port";

export class HandleEscalationDomainEventUseCase {
  constructor(
    private readonly ruleRepository: IEscalationRuleRepository,
    private readonly historyRepository: IEscalationHistoryRepository
  ) {}

  async execute(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const ticketType =
      payload.ticketType === "request" ? "request" : ("incident" as const);
    const ticketId = String(payload.ticketId ?? payload.incidentId ?? "");
    if (!ticketId) return;

    const rules = await this.ruleRepository.listActiveByTicketType(
      ticketType === "request" ? "request" : "incident"
    );

    for (const rule of rules) {
      if (!this.ruleMatches(rule, eventType, payload)) continue;
      const recent = await this.historyRepository.existsRecent(rule.id, ticketId, ticketType, 60);
      if (recent) continue;

      for (const action of rule.actions) {
        await this.historyRepository.create({
          ruleId: rule.id,
          ticketId,
          ticketType,
          actionExecuted: action,
          payload: { eventType, ruleName: rule.name, ...payload },
        });
      }
    }
  }

  private ruleMatches(
    rule: EscalationRule,
    eventType: string,
    payload: Record<string, unknown>
  ): boolean {
    switch (rule.conditionType) {
      case "criticality":
        return (
          eventType === INCIDENT_CREATED_EVENT &&
          String(payload.criticality ?? "") === rule.conditionValue
        );
      case "sla_risk_percent": {
        if (eventType !== SLA_RISK_EVENT) return false;
        const threshold = parseFloat(rule.conditionValue);
        const percent = Number(payload.percentUsed ?? 0);
        return Number.isFinite(threshold) && percent >= threshold;
      }
      case "sla_breach":
        return eventType === SLA_BREACH_EVENT;
      case "no_first_response_minutes":
        return false;
      default:
        return false;
    }
  }
}
