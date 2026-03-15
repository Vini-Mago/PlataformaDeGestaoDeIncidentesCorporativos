import type { ICalendarRepository } from "../ports/calendar-repository.port";

export class ListCalendarsUseCase {
  constructor(private readonly calendarRepository: ICalendarRepository) {}

  async execute() {
    return this.calendarRepository.list();
  }
}
