import { Prisma, PrismaClient } from "../../../../generated/prisma-client/index";
import type { AuditEntry } from "../../../domain/entities/audit-entry.entity";
import type {
  IAuditEntryRepository,
  CreateAuditEntryInput,
  AuditEntryListFilters,
} from "../../../application/ports/audit-entry-repository.port";

export class PrismaAuditEntryRepository implements IAuditEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const row = await this.prisma.auditEntryModel.create({
      data: {
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toAuditEntry(row);
  }

  async findById(id: string): Promise<AuditEntry | null> {
    const row = await this.prisma.auditEntryModel.findUnique({ where: { id } });
    return row ? this.toAuditEntry(row) : null;
  }

  async list(filters: AuditEntryListFilters = {}): Promise<AuditEntry[]> {
    const defaultLimit = 100;
    const maxLimit = 500;
    const limit = Math.min(filters.limit ?? defaultLimit, maxLimit);
    const offset = filters.offset ?? 0;
    const rows = await this.prisma.auditEntryModel.findMany({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.resourceId && { resourceId: filters.resourceId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.toAuditEntry(r));
  }

  private toAuditEntry(row: {
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    metadata: unknown;
    createdAt: Date;
  }): AuditEntry {
    return {
      id: row.id,
      userId: row.userId,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      metadata: row.metadata != null && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
      createdAt: row.createdAt,
    };
  }
}
