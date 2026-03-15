import { logger } from "@pgic/shared";
import type { PrismaClient } from "../../../../generated/prisma-client";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 2_000;

type OutboxRow = {
  id: string;
  event_name: string;
  payload: unknown;
  created_at: Date;
  published_at: Date | null;
};

function toPlainObject(raw: unknown): object | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as object;
}

export class OutboxRelayAdapter {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: IEventPublisher,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  async runOnce(): Promise<void> {
    const toPublish = await this.prisma.$transaction(async (tx) => {
      const rawRows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, event_name, payload, created_at, published_at
        FROM outbox
        WHERE published_at IS NULL
          AND discarded_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
        ORDER BY created_at ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      const items: { id: string; event_name: string; payload: object }[] = [];
      const now = new Date();

      for (const row of rawRows) {
        const raw = row.payload;
        let payload: object | null = toPlainObject(raw);
        if (payload === null && typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw) as unknown;
            payload = toPlainObject(parsed);
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            logger.warn({ outboxId: row.id, eventName: row.event_name, terminalError: msg }, "Outbox relay: invalid JSON payload, marking as discarded");
            await tx.outboxModel.update({
              where: { id: row.id },
              data: { discardedAt: now },
            });
            continue;
          }
        }
        if (payload === null) {
          logger.warn({ outboxId: row.id, eventName: row.event_name, terminalError: "Payload is null, not object, or array" }, "Outbox relay: marking as discarded");
          await tx.outboxModel.update({
            where: { id: row.id },
            data: { discardedAt: now },
          });
          continue;
        }
        await tx.outboxModel.update({
          where: { id: row.id },
          data: { claimedAt: now },
        });
        items.push({ id: row.id, event_name: row.event_name, payload });
      }

      return items;
    });

    for (const item of toPublish) {
      try {
        await this.eventPublisher.publish(item.event_name, item.payload);
        await this.prisma.outboxModel.update({
          where: { id: item.id },
          data: { publishedAt: new Date() },
        });
      } catch (err) {
        logger.warn({ err, outboxId: item.id, eventName: item.event_name }, "Outbox relay: publish failed, will retry");
      }
    }
  }

  start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (this.timeoutId != null) return;
    this.stopped = false;
    const scheduleNext = (): void => {
      if (this.stopped) return;
      this.timeoutId = setTimeout(() => {
        this.runOnce()
          .catch((err) => logger.error({ err }, "Outbox relay runOnce failed"))
          .finally(() => {
            this.timeoutId = null;
            if (!this.stopped) scheduleNext();
          });
      }, intervalMs);
    };
    scheduleNext();
    logger.info({ intervalMs }, "Outbox relay started");
  }

  stop(): void {
    this.stopped = true;
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      logger.info("Outbox relay stopped");
    }
  }
}
