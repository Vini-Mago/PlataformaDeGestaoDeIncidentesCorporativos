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
  processing_at: Date | null;
  failed_at: Date | null;
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
    const rawRows = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, event_name, payload, created_at, published_at, processing_at, failed_at
        FROM outbox
        WHERE published_at IS NULL
          AND failed_at IS NULL
          AND (processing_at IS NULL OR processing_at < NOW() - INTERVAL '5 minutes')
        ORDER BY created_at ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      `;
      const now = new Date();
      for (const row of rows) {
        await tx.outboxModel.update({
          where: { id: row.id },
          data: { processingAt: now },
        });
      }
      return rows;
    });

    for (const row of rawRows) {
      try {
        const raw = row.payload;
        let payload: object | null = toPlainObject(raw);
        if (payload === null && typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw) as unknown;
            payload = toPlainObject(parsed);
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            logger.warn({ outboxId: row.id, eventName: row.event_name, terminalError: msg }, "Outbox relay: invalid JSON payload, marking as terminal");
            await this.prisma.outboxModel.update({
              where: { id: row.id },
              data: { failedAt: new Date(), terminalError: `Invalid JSON: ${msg}` },
            });
            continue;
          }
        }
        if (payload === null) {
          const terminalError = "Payload is null, not object, or array";
          logger.warn({ outboxId: row.id, eventName: row.event_name, terminalError }, "Outbox relay: marking as terminal");
          await this.prisma.outboxModel.update({
            where: { id: row.id },
            data: { failedAt: new Date(), terminalError },
          });
          continue;
        }
        await this.eventPublisher.publish(row.event_name, payload);
        await this.prisma.outboxModel.update({
          where: { id: row.id },
          data: { publishedAt: new Date() },
        });
      } catch (err) {
        logger.warn({ err, outboxId: row.id, eventName: row.event_name }, "Outbox relay: publish failed, will retry");
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
