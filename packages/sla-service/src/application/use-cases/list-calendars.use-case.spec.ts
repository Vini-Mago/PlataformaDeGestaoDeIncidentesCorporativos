import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListCalendarsUseCase } from "./list-calendars.use-case";
import type { ICalendarRepository } from "../ports/calendar-repository.port";

describe("ListCalendarsUseCase", () => {
  let calendarRepository: ICalendarRepository;
  const mockList = [
    {
      id: "id-1",
      name: "Cal 1",
      timezone: "UTC",
      workingDays: [1, 2, 3],
      workStartMinutes: 480,
      workEndMinutes: 1080,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    calendarRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue(mockList),
    };
  });

  it("returns list from repository", async () => {
    const useCase = new ListCalendarsUseCase(calendarRepository);
    const result = await useCase.execute();
    expect(result).toEqual(mockList);
    expect(calendarRepository.list).toHaveBeenCalled();
  });
});
