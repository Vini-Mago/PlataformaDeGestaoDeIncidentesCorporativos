import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetCalendarUseCase } from "./get-calendar.use-case";
import { CalendarNotFoundError } from "../errors";
import type { ICalendarRepository } from "../ports/calendar-repository.port";

describe("GetCalendarUseCase", () => {
  let calendarRepository: ICalendarRepository;
  const calendarId = "11111111-1111-1111-1111-111111111111";
  const mockCalendar = {
    id: calendarId,
    name: "Business Hours",
    timezone: "UTC",
    workingDays: [1, 2, 3, 4, 5],
    workStartMinutes: 480,
    workEndMinutes: 1080,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    calendarRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockCalendar),
      list: vi.fn(),
    };
  });

  it("returns calendar when found", async () => {
    const useCase = new GetCalendarUseCase(calendarRepository);
    const result = await useCase.execute(calendarId);
    expect(result).toEqual(mockCalendar);
    expect(calendarRepository.findById).toHaveBeenCalledWith(calendarId);
  });

  it("throws CalendarNotFoundError when not found", async () => {
    vi.mocked(calendarRepository.findById).mockResolvedValue(null);
    const useCase = new GetCalendarUseCase(calendarRepository);
    await expect(useCase.execute(calendarId)).rejects.toThrow(CalendarNotFoundError);
    await expect(useCase.execute(calendarId)).rejects.toThrow(`Calendar not found: ${calendarId}`);
  });
});
