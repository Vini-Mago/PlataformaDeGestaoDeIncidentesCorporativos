import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  IReplicatedUserStore,
  ReplicatedUserData,
} from "../../../application/ports/replicated-user-store.port";

export class PrismaReplicatedUserStore implements IReplicatedUserStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: ReplicatedUserData): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO replicated_users (id, email, name, last_event_occurred_at, updated_at)
      VALUES (${data.id}, ${data.email}, ${data.name}, ${data.lastEventOccurredAt}, ${data.lastEventOccurredAt})
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        last_event_occurred_at = EXCLUDED.last_event_occurred_at,
        updated_at = now()
      WHERE (replicated_users.last_event_occurred_at IS NULL OR replicated_users.last_event_occurred_at < EXCLUDED.last_event_occurred_at)
    `;
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
