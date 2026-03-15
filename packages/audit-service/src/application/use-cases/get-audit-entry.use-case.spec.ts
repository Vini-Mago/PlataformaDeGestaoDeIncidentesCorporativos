import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetAuditEntryUseCase } from "./get-audit-entry.use-case";
import { AuditEntryNotFoundError } from "../errors";
import type { IAuditEntryRepository } from "../ports/audit-entry-repository.port";
import type { AuditEntry } from "../../domain/entities/audit-entry.entity";

describe("GetAuditEntryUseCase", () => {
  let auditEntryRepository: IAuditEntryRepository;
  const entryId = "11111111-1111-1111-1111-111111111111";
  const mockEntry: AuditEntry = {
    id: entryId,
    userId: "22222222-2222-2222-2222-222222222222",
    action: "incident.created",
    resourceType: "incident",
    resourceId: "33333333-3333-3333-3333-333333333333",
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    auditEntryRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockEntry),
      list: vi.fn(),
    };
  });

  it("returns entry when it exists", async () => {
    const useCase = new GetAuditEntryUseCase(auditEntryRepository);
    const result = await useCase.execute(entryId);
    expect(result).toEqual(mockEntry);
    expect(auditEntryRepository.findById).toHaveBeenCalledWith(entryId);
  });

  it("throws AuditEntryNotFoundError when entry does not exist", async () => {
    vi.mocked(auditEntryRepository.findById).mockResolvedValue(null);
    const useCase = new GetAuditEntryUseCase(auditEntryRepository);
    const missingId = "00000000-0000-0000-0000-000000000000";

    await expect(useCase.execute(missingId)).rejects.toThrow(AuditEntryNotFoundError);
    await expect(useCase.execute(missingId)).rejects.toThrow(`Audit entry not found: ${missingId}`);
  });
});
