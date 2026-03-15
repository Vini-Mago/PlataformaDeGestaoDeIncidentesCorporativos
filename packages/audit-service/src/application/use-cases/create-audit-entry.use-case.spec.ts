import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateAuditEntryUseCase } from "./create-audit-entry.use-case";
import type { IAuditEntryRepository } from "../ports/audit-entry-repository.port";
import type { AuditEntry } from "../../domain/entities/audit-entry.entity";

describe("CreateAuditEntryUseCase", () => {
  let auditEntryRepository: IAuditEntryRepository;
  const mockEntry: AuditEntry = {
    id: "22222222-2222-2222-2222-222222222222",
    userId: "11111111-1111-1111-1111-111111111111",
    action: "incident.created",
    resourceType: "incident",
    resourceId: "33333333-3333-3333-3333-333333333333",
    metadata: { priority: "high" },
    createdAt: new Date(),
  };

  beforeEach(() => {
    auditEntryRepository = {
      create: vi.fn().mockResolvedValue(mockEntry),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates audit entry with required fields", async () => {
    const useCase = new CreateAuditEntryUseCase(auditEntryRepository);
    const dto = {
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.created",
      resourceType: "incident",
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockEntry);
    expect(auditEntryRepository.create).toHaveBeenCalledWith({
      userId: dto.userId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: null,
      metadata: null,
    });
  });

  it("creates audit entry with optional resourceId and metadata", async () => {
    const useCase = new CreateAuditEntryUseCase(auditEntryRepository);
    const dto = {
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.updated",
      resourceType: "incident",
      resourceId: "33333333-3333-3333-3333-333333333333",
      metadata: { field: "status", previous: "open", next: "closed" },
    };

    await useCase.execute(dto);

    expect(auditEntryRepository.create).toHaveBeenCalledWith({
      userId: dto.userId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      metadata: dto.metadata,
    });
  });
});
