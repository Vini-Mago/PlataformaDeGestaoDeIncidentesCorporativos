import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetSlaPolicyUseCase } from "./get-sla-policy.use-case";
import { SlaPolicyNotFoundError } from "../errors";
import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";

describe("GetSlaPolicyUseCase", () => {
  let slaPolicyRepository: ISlaPolicyRepository;
  const policyId = "11111111-1111-1111-1111-111111111111";
  const mockPolicy = {
    id: policyId,
    name: "Incident Critical",
    ticketType: "incident" as const,
    criticality: "Critical",
    serviceId: null,
    clientId: null,
    responseMinutes: 15,
    resolutionMinutes: 240,
    calendarId: "cal-1",
    priority: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    slaPolicyRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockPolicy),
      list: vi.fn(),
    };
  });

  it("returns policy when found", async () => {
    const useCase = new GetSlaPolicyUseCase(slaPolicyRepository);
    const result = await useCase.execute(policyId);
    expect(result).toEqual(mockPolicy);
    expect(slaPolicyRepository.findById).toHaveBeenCalledWith(policyId);
  });

  it("throws SlaPolicyNotFoundError when not found", async () => {
    vi.mocked(slaPolicyRepository.findById).mockResolvedValue(null);
    const useCase = new GetSlaPolicyUseCase(slaPolicyRepository);
    await expect(useCase.execute(policyId)).rejects.toThrow(SlaPolicyNotFoundError);
    await expect(useCase.execute(policyId)).rejects.toThrow(`SLA policy not found: ${policyId}`);
  });
});
