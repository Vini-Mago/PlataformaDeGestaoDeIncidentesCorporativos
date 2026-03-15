import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { CreateSlaPolicyDto } from "../dtos/create-sla-policy.dto";
import { CalendarNotFoundError } from "../errors";

export class CreateSlaPolicyUseCase {
  constructor(
    private readonly slaPolicyRepository: ISlaPolicyRepository,
    private readonly calendarRepository: ICalendarRepository
  ) {}

  async execute(dto: CreateSlaPolicyDto) {
    const calendar = await this.calendarRepository.findById(dto.calendarId);
    if (!calendar) throw new CalendarNotFoundError(dto.calendarId);
    return this.slaPolicyRepository.create({
      name: dto.name,
      ticketType: dto.ticketType,
      criticality: dto.criticality ?? null,
      serviceId: dto.serviceId ?? null,
      clientId: dto.clientId ?? null,
      responseMinutes: dto.responseMinutes,
      resolutionMinutes: dto.resolutionMinutes,
      calendarId: dto.calendarId,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
    });
  }
}
