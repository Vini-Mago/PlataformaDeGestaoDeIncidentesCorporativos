import type { IAuditEntryRepository } from "../ports/audit-entry-repository.port";
import { AuditEntryNotFoundError } from "../errors";

export class GetAuditEntryUseCase {
  constructor(private readonly auditEntryRepository: IAuditEntryRepository) {}

  async execute(id: string) {
    const entry = await this.auditEntryRepository.findById(id);
    if (!entry) throw new AuditEntryNotFoundError(id);
    return entry;
  }
}
