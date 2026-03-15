import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { CreateCalendarDto } from "../dtos/create-calendar.dto";

export class CreateCalendarUseCase {
  constructor(private readonly calendarRepository: ICalendarRepository) {}

  async execute(dto: CreateCalendarDto) {
    return this.calendarRepository.create({
      name: dto.name,
      timezone: dto.timezone ?? "UTC",
      workingDays: dto.workingDays,
      workStartMinutes: dto.workStartMinutes,
      workEndMinutes: dto.workEndMinutes,
    });
  }
}
