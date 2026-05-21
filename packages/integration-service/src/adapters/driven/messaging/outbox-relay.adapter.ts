import { logger } from "@pgic/shared";
import type { PrismaClient } from "../../../../generated/prisma-client/index";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 2_000;

type OutboxRow = {
  id: string;
  event_name: string;
  payload: unknown;
  claimed_at: Date | null;
  failed_at: Date | null;
};

function toPlainObject(raw: unknown): object | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
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
        SELECT id, event_name, payload, claimed_at, failed_at
        FROM outbox
        WHERE published_at IS NULL
          AND failed_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
        ORDER BY created_at ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      `;
      const now = new Date();
      for (const row of rows) {
        await tx.outboxModel.update({ where: { id: row.id }, data: { claimedAt: now } });
      }
      return rows;
    });

    for (const row of rawRows) {
      try {
        const payload = toPlainObject(row.payload);
        if (!payload) {
          await this.prisma.outboxModel.update({
            where: { id: row.id },
            data: { failedAt: new Date(), terminalError: "Invalid payload" },
          });
          continue;
        }
        await this.eventPublisher.publish(row.event_name, payload);
        await this.prisma.outboxModel.update({
          where: { id: row.id },
          data: { publishedAt: new Date() },
        });
      } catch (err) {
        logger.warn({ err, outboxId: row.id }, "integration outbox relay: publish failed");
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
          .catch((err) => logger.error({ err }, "integration outbox relay failed"))
          .finally(() => {
            this.timeoutId = null;
            if (!this.stopped) scheduleNext();
          });
      }, intervalMs);
    };
    scheduleNext();
  }

  stop(): void {
    this.stopped = true;
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
