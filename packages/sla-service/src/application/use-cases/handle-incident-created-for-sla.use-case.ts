import { addBusinessMinutes } from "../../domain/business-time";
import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import type { ISlaAssignmentRepository } from "../ports/sla-assignment-repository.port";

export interface IncidentCreatedSlaPayload {
  incidentId: string;
  criticality: string;
  serviceAffected?: string | null;
  occurredAt?: string;
}

export class HandleIncidentCreatedForSlaUseCase {
  constructor(
    private readonly slaPolicyRepository: ISlaPolicyRepository,
    private readonly calendarRepository: ICalendarRepository,
    private readonly slaAssignmentRepository: ISlaAssignmentRepository
  ) {}

  async execute(payload: IncidentCreatedSlaPayload): Promise<void> {
    const existing = await this.slaAssignmentRepository.findByTicket(
      payload.incidentId,
      "incident"
    );
    if (existing) return;

    const policy = await this.slaPolicyRepository.resolveBestMatch({
      ticketType: "incident",
      criticality: payload.criticality,
      serviceId: payload.serviceAffected ?? null,
    });
    if (!policy) return;

    const calendar = await this.calendarRepository.findById(policy.calendarId);
    if (!calendar) return;

    const holidays = await this.calendarRepository.listHolidayDates(policy.calendarId);
    const startedAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    const calConfig = {
      workingDays: calendar.workingDays,
      workStartMinutes: calendar.workStartMinutes,
      workEndMinutes: calendar.workEndMinutes,
    };

    const responseDeadline = addBusinessMinutes(
      startedAt,
      policy.responseMinutes,
      calConfig,
      holidays
    );
    const resolutionDeadline = addBusinessMinutes(
      startedAt,
      policy.resolutionMinutes,
      calConfig,
      holidays
    );

    await this.slaAssignmentRepository.create({
      ticketId: payload.incidentId,
      ticketType: "incident",
      policyId: policy.id,
      responseDeadline,
      resolutionDeadline,
      clockStartedAt: startedAt,
    });
  }
}
