import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListAuditEntriesUseCase } from "./list-audit-entries.use-case";
import type { IAuditEntryRepository } from "../ports/audit-entry-repository.port";

describe("ListAuditEntriesUseCase", () => {
  let auditEntryRepository: IAuditEntryRepository;

  beforeEach(() => {
    auditEntryRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("lists entries with no filters", async () => {
    const useCase = new ListAuditEntriesUseCase(auditEntryRepository);
    await useCase.execute({});
    expect(auditEntryRepository.list).toHaveBeenCalledWith({});
  });

  it("lists entries with userId, resourceType and resourceId filters", async () => {
    const useCase = new ListAuditEntriesUseCase(auditEntryRepository);
    await useCase.execute({
      userId: "11111111-1111-1111-1111-111111111111",
      resourceType: "incident",
      resourceId: "22222222-2222-2222-2222-222222222222",
    });
    expect(auditEntryRepository.list).toHaveBeenCalledWith({
      userId: "11111111-1111-1111-1111-111111111111",
      resourceType: "incident",
      resourceId: "22222222-2222-2222-2222-222222222222",
    });
  });
});
