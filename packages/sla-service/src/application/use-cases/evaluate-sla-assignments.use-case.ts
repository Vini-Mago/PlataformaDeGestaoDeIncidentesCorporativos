import { SLA_BREACH_EVENT, SLA_RISK_EVENT } from "@pgic/shared";
import { percentBusinessTimeElapsed } from "../../domain/business-time";
import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import type { ISlaAssignmentRepository, IOutboxWriter } from "../ports/sla-assignment-repository.port";

const RISK_THRESHOLD_PERCENT = 80;

export class EvaluateSlaAssignmentsUseCase {
  constructor(
    private readonly slaAssignmentRepository: ISlaAssignmentRepository,
    private readonly slaPolicyRepository: ISlaPolicyRepository,
    private readonly calendarRepository: ICalendarRepository,
    private readonly outboxWriter: IOutboxWriter
  ) {}

  async execute(): Promise<void> {
    const now = new Date();
    const assignments = await this.slaAssignmentRepository.listActive();

    for (const assignment of assignments) {
      const policy = await this.slaPolicyRepository.findById(assignment.policyId);
      if (!policy) continue;
      const calendar = await this.calendarRepository.findById(policy.calendarId);
      if (!calendar) continue;
      const holidays = await this.calendarRepository.listHolidayDates(policy.calendarId);
      const calConfig = {
        workingDays: calendar.workingDays,
        workStartMinutes: calendar.workStartMinutes,
        workEndMinutes: calendar.workEndMinutes,
      };

      const percentUsed = percentBusinessTimeElapsed(
        assignment.clockStartedAt,
        assignment.resolutionDeadline,
        now,
        calConfig,
        holidays
      );

      if (!assignment.riskEmitted && percentUsed >= RISK_THRESHOLD_PERCENT) {
        await this.outboxWriter.enqueue(SLA_RISK_EVENT, {
          ticketId: assignment.ticketId,
          ticketType: assignment.ticketType,
          percentUsed,
          deadlineType: "resolution",
          occurredAt: now.toISOString(),
        });
        await this.slaAssignmentRepository.markRiskEmitted(assignment.id);
      }

      if (!assignment.responseBreachEmitted && now > assignment.responseDeadline) {
        await this.outboxWriter.enqueue(SLA_BREACH_EVENT, {
          ticketId: assignment.ticketId,
          ticketType: assignment.ticketType,
          breachType: "response",
          occurredAt: now.toISOString(),
        });
        await this.slaAssignmentRepository.markResponseBreachEmitted(assignment.id);
      }

      if (!assignment.resolutionBreachEmitted && now > assignment.resolutionDeadline) {
        await this.outboxWriter.enqueue(SLA_BREACH_EVENT, {
          ticketId: assignment.ticketId,
          ticketType: assignment.ticketType,
          breachType: "resolution",
          percentUsed: 100,
          occurredAt: now.toISOString(),
        });
        await this.slaAssignmentRepository.markResolutionBreachEmitted(assignment.id);
      }
    }
  }
}
