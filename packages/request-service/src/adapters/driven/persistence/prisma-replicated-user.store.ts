import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  IReplicatedUserStore,
  ReplicatedUserData,
} from "../../../application/ports/replicated-user-store.port";

/** Normalize lastEventOccurredAt from DB (legacy nulls) to satisfy ReplicatedUserData contract. */
function toLastEventOccurredAt(value: Date | null | undefined): Date {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date(0);
}

export class PrismaReplicatedUserStore implements IReplicatedUserStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: ReplicatedUserData): Promise<void> {
    try {
      await this.prisma.replicatedUserModel.create({
        data: {
          id: data.id,
          email: data.email,
          name: data.name,
          lastEventOccurredAt: data.lastEventOccurredAt,
          updatedAt: data.lastEventOccurredAt,
        },
      });
      return;
    } catch (err: unknown) {
      const isUniqueViolation =
        err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
      if (!isUniqueViolation) throw err;
    }
    const updated = await this.prisma.$executeRaw`
      UPDATE replicated_users
      SET email = ${data.email}, name = ${data.name},
          last_event_occurred_at = ${data.lastEventOccurredAt}, updated_at = ${data.lastEventOccurredAt}
      WHERE id = ${data.id}
        AND (last_event_occurred_at < ${data.lastEventOccurredAt} OR last_event_occurred_at IS NULL)
    `;
    if (updated === 0) {
      return;
    }
  }

  async findById(id: string): Promise<ReplicatedUserData | null> {
    const row = await this.prisma.replicatedUserModel.findUnique({
      where: { id },
    });
    if (!row) return null;
    const lastEventOccurredAt = toLastEventOccurredAt(row.lastEventOccurredAt);
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      lastEventOccurredAt,
    };
  }
}
