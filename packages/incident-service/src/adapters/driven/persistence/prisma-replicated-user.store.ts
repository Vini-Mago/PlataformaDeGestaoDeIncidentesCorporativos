import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  IReplicatedUserStore,
  ReplicatedUserData,
} from "../../../application/ports/replicated-user-store.port";

export class PrismaReplicatedUserStore implements IReplicatedUserStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: ReplicatedUserData): Promise<void> {
    const existing = await this.prisma.replicatedUserModel.findUnique({
      where: { id: data.id },
    });
    if (existing && data.lastEventOccurredAt <= existing.lastEventOccurredAt) {
      return; // Stale event, skip update to avoid regressing state
    }
    await this.prisma.replicatedUserModel.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        name: data.name,
        lastEventOccurredAt: data.lastEventOccurredAt,
      },
      update: {
        email: data.email,
        name: data.name,
        lastEventOccurredAt: data.lastEventOccurredAt,
      },
    });
  }

  async findById(id: string): Promise<ReplicatedUserData | null> {
    const row = await this.prisma.replicatedUserModel.findUnique({
      where: { id },
    });
    return row
      ? {
          id: row.id,
          email: row.email,
          name: row.name,
          lastEventOccurredAt: row.lastEventOccurredAt,
        }
      : null;
  }
}
