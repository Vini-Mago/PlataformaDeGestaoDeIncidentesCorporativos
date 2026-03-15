import type { ICalendarRepository } from "../ports/calendar-repository.port";
import { CalendarNotFoundError } from "../errors";

export class GetCalendarUseCase {
  constructor(private readonly calendarRepository: ICalendarRepository) {}

  async execute(id: string) {
    const calendar = await this.calendarRepository.findById(id);
    if (!calendar) throw new CalendarNotFoundError(id);
    return calendar;
  }
}
