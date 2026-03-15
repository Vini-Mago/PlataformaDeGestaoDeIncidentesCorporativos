import type { IAuditEntryRepository, AuditEntryListFilters } from "../ports/audit-entry-repository.port";

export class ListAuditEntriesUseCase {
  constructor(private readonly auditEntryRepository: IAuditEntryRepository) {}

  async execute(filters: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
    offset?: number;
  }) {
    const listFilters: AuditEntryListFilters = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.resourceId && { resourceId: filters.resourceId }),
      ...(filters.limit !== undefined && { limit: filters.limit }),
      ...(filters.offset !== undefined && { offset: filters.offset }),
    };
    return this.auditEntryRepository.list(listFilters);
  }
}
