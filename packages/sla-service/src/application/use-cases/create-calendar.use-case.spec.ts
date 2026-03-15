import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateCalendarUseCase } from "./create-calendar.use-case";
import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { Calendar } from "../../domain/entities/calendar.entity";

describe("CreateCalendarUseCase", () => {
  let calendarRepository: ICalendarRepository;
  const mockCalendar: Calendar = {
    id: "22222222-2222-2222-2222-222222222222",
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
      create: vi.fn().mockResolvedValue(mockCalendar),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates calendar successfully", async () => {
    const useCase = new CreateCalendarUseCase(calendarRepository);
    const dto = {
      name: "Business Hours",
      workingDays: [1, 2, 3, 4, 5],
      workStartMinutes: 480,
      workEndMinutes: 1080,
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockCalendar);
    expect(calendarRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      timezone: "UTC",
      workingDays: dto.workingDays,
      workStartMinutes: dto.workStartMinutes,
      workEndMinutes: dto.workEndMinutes,
    });
  });

  it("passes custom timezone when provided", async () => {
    const useCase = new CreateCalendarUseCase(calendarRepository);
    const dto = {
      name: "Local",
      timezone: "America/Sao_Paulo",
      workingDays: [1, 2, 3, 4, 5],
      workStartMinutes: 540,
      workEndMinutes: 1080,
    };

    await useCase.execute(dto);

    expect(calendarRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: "America/Sao_Paulo" })
    );
  });
});
