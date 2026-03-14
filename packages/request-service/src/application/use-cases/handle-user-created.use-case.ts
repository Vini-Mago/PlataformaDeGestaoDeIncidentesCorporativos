import type { IReplicatedUserStore } from "../ports/replicated-user-store.port";
import { userCreatedPayloadSchema } from "../dtos/user-created-payload.schema";
import { logger } from "@pgic/shared";

/**
 * Handles user.created event: validates payload and upserts replicated user.
 * Invalid payloads are logged and skipped (no store write).
 */
export class HandleUserCreatedUseCase {
  constructor(private readonly replicatedUserStore: IReplicatedUserStore) {}

  async execute(rawPayload: unknown): Promise<{ ok: boolean; reason?: string }> {
    const parsed = userCreatedPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const sanitizedPayload =
        typeof rawPayload === "object" && rawPayload !== null && "userId" in rawPayload
          ? { userId: (rawPayload as { userId: unknown }).userId }
          : {};
      logger.warn(
        { payload: sanitizedPayload, errors: parsed.error.flatten() },
        "handleUserCreated: invalid payload, skipping"
      );
      return { ok: false, reason: "invalid_payload" };
    }

    const { userId, email, name, occurredAt } = parsed.data;
    const lastEventOccurredAt = new Date(occurredAt);

    await this.replicatedUserStore.upsert({
      id: userId,
      email,
      name,
      lastEventOccurredAt,
    });

    logger.debug({ userId }, "Replicated user created/updated");
    return { ok: true };
  }
}
