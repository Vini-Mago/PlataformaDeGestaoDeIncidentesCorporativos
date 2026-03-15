import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateSlaPolicyUseCase } from "./create-sla-policy.use-case";
import { CalendarNotFoundError } from "../errors";
import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import type { ICalendarRepository } from "../ports/calendar-repository.port";
import type { SlaPolicy } from "../../domain/entities/sla-policy.entity";

describe("CreateSlaPolicyUseCase", () => {
  let slaPolicyRepository: ISlaPolicyRepository;
  let calendarRepository: ICalendarRepository;
  const calendarId = "11111111-1111-1111-1111-111111111111";
  const mockPolicy: SlaPolicy = {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Incident Critical",
    ticketType: "incident",
    criticality: "Critical",
    serviceId: null,
    clientId: null,
    responseMinutes: 15,
    resolutionMinutes: 240,
    calendarId,
    priority: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    calendarRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: calendarId, name: "Cal", timezone: "UTC", workingDays: [1], workStartMinutes: 0, workEndMinutes: 1440, createdAt: new Date(), updatedAt: new Date() }),
      list: vi.fn(),
    };
    slaPolicyRepository = {
      create: vi.fn().mockResolvedValue(mockPolicy),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates SLA policy when calendar exists", async () => {
    const useCase = new CreateSlaPolicyUseCase(slaPolicyRepository, calendarRepository);
    const dto = {
      name: "Incident Critical",
      ticketType: "incident" as const,
      criticality: "Critical" as const,
      responseMinutes: 15,
      resolutionMinutes: 240,
      calendarId,
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockPolicy);
    expect(calendarRepository.findById).toHaveBeenCalledWith(calendarId);
    expect(slaPolicyRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      ticketType: dto.ticketType,
      criticality: "Critical",
      serviceId: null,
      clientId: null,
      responseMinutes: 15,
      resolutionMinutes: 240,
      calendarId,
      priority: 0,
      isActive: true,
    });
  });

  it("throws CalendarNotFoundError when calendar does not exist", async () => {
    vi.mocked(calendarRepository.findById).mockResolvedValue(null);
    const useCase = new CreateSlaPolicyUseCase(slaPolicyRepository, calendarRepository);
    const dto = {
      name: "Policy",
      ticketType: "incident" as const,
      responseMinutes: 60,
      resolutionMinutes: 480,
      calendarId: "00000000-0000-0000-0000-000000000000",
    };

    await expect(useCase.execute(dto)).rejects.toThrow(CalendarNotFoundError);
    await expect(useCase.execute(dto)).rejects.toThrow(`Calendar not found: ${dto.calendarId}`);
    expect(slaPolicyRepository.create).not.toHaveBeenCalled();
  });
});
