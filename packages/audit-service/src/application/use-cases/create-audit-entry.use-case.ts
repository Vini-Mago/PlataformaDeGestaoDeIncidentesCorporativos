import type { IAuditEntryRepository } from "../ports/audit-entry-repository.port";
import type { CreateAuditEntryDto } from "../dtos/create-audit-entry.dto";

export class CreateAuditEntryUseCase {
  constructor(private readonly auditEntryRepository: IAuditEntryRepository) {}

  async execute(dto: CreateAuditEntryDto) {
    return this.auditEntryRepository.create({
      userId: dto.userId,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId ?? null,
      metadata: dto.metadata ?? null,
    });
  }
}
