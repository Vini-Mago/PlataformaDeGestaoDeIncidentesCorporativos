import type { PrismaClient } from "../../../../generated/prisma-client/index";
import type { EntityVersionRecord, IVersionHistoryRepository } from "../../../application/ports/version-history.port";

function toSnapshot(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export class PrismaVersionHistoryRepository implements IVersionHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listProblemVersions(problemId: string, limit: number): Promise<EntityVersionRecord[]> {
    const rows = await this.prisma.problemVersionModel.findMany({
      where: { problemId },
      orderBy: { versionNumber: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map((row) => ({
      id: row.id,
      versionNumber: row.versionNumber,
      changedById: row.changedById,
      snapshot: toSnapshot(row.snapshot),
      createdAt: row.createdAt,
    }));
  }

  async listChangeVersions(changeId: string, limit: number): Promise<EntityVersionRecord[]> {
    const rows = await this.prisma.changeVersionModel.findMany({
      where: { changeId },
      orderBy: { versionNumber: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map((row) => ({
      id: row.id,
      versionNumber: row.versionNumber,
      changedById: row.changedById,
      snapshot: toSnapshot(row.snapshot),
      createdAt: row.createdAt,
    }));
  }
}
