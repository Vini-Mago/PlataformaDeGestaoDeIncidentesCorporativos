import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListSlaPoliciesUseCase, parseTicketTypeFilter } from "./list-sla-policies.use-case";
import { InvalidTicketTypeError } from "../errors";
import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";

describe("ListSlaPoliciesUseCase", () => {
  let slaPolicyRepository: ISlaPolicyRepository;
  const mockList = [
    {
      id: "id-1",
      name: "Policy 1",
      ticketType: "incident" as const,
      criticality: "High",
      serviceId: null,
      clientId: null,
      responseMinutes: 30,
      resolutionMinutes: 480,
      calendarId: "cal-1",
      priority: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    slaPolicyRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue(mockList),
    };
  });

  it("returns list from repository with no filters", async () => {
    const useCase = new ListSlaPoliciesUseCase(slaPolicyRepository);
    const result = await useCase.execute();
    expect(result).toEqual(mockList);
    expect(slaPolicyRepository.list).toHaveBeenCalledWith({});
  });

  it("passes ticketType and isActive filters", async () => {
    const useCase = new ListSlaPoliciesUseCase(slaPolicyRepository);
    await useCase.execute({ ticketType: "incident", isActive: true });
    expect(slaPolicyRepository.list).toHaveBeenCalledWith({
      ticketType: "incident",
      isActive: true,
    });
  });
});

describe("parseTicketTypeFilter", () => {
  it("returns undefined for null or empty", () => {
    expect(parseTicketTypeFilter(null)).toBeUndefined();
    expect(parseTicketTypeFilter("")).toBeUndefined();
  });

  it("returns incident for incident", () => {
    expect(parseTicketTypeFilter("incident")).toBe("incident");
  });

  it("returns request for request", () => {
    expect(parseTicketTypeFilter("request")).toBe("request");
  });

  it("throws InvalidTicketTypeError for invalid value", () => {
    expect(() => parseTicketTypeFilter("invalid")).toThrow(InvalidTicketTypeError);
  });
});
