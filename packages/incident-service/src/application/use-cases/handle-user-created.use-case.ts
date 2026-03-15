import type { IReplicatedUserStore } from "../ports/replicated-user-store.port";
import { userCreatedPayloadSchema } from "../dtos/user-created-payload.schema";
import { logger } from "@pgic/shared";

export class HandleUserCreatedUseCase {
  constructor(private readonly replicatedUserStore: IReplicatedUserStore) {}

  async execute(rawPayload: unknown): Promise<{ ok: boolean; reason?: string }> {
    const parsed = userCreatedPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      logger.warn(
        { userId: typeof rawPayload === "object" && rawPayload !== null && "userId" in rawPayload ? (rawPayload as { userId?: unknown }).userId : undefined, errors: parsed.error.flatten() },
        "handleUserCreated: invalid payload, skipping"
      );
      return { ok: false, reason: "invalid_payload" };
    }
    const { userId, email, name, occurredAt } = parsed.data;
    const existing = await this.replicatedUserStore.findById(userId);
    if (existing && new Date(occurredAt) <= existing.lastEventOccurredAt) {
      return { ok: true }; // Stale event, skip to avoid regressing state
    }
    await this.replicatedUserStore.upsert({
      id: userId,
      email,
      name,
      lastEventOccurredAt: new Date(occurredAt),
    });
    return { ok: true };
  }
}
