import { logger } from "@pgic/shared";
import type { PrismaClient } from "../../../../generated/prisma-client";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 2_000;

export class OutboxRelayAdapter {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: IEventPublisher,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  async runOnce(): Promise<void> {
    const rows = await this.prisma.outboxModel.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: "asc" },
      take: this.batchSize,
    });

    for (const row of rows) {
      try {
        const raw = row.payload;
        let payload: object;
        if (raw == null || typeof raw !== "object") {
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
                payload = parsed as object;
              } else {
                logger.warn({ outboxId: row.id, eventName: row.eventName }, "Outbox relay: invalid payload, marking as terminal");
                await this.prisma.outboxModel.update({
                  where: { id: row.id },
                  data: { publishedAt: new Date() },
                });
                continue;
              }
            } catch {
              logger.warn({ outboxId: row.id, eventName: row.eventName }, "Outbox relay: invalid JSON payload, marking as terminal");
              await this.prisma.outboxModel.update({
                where: { id: row.id },
                data: { publishedAt: new Date() },
              });
              continue;
            }
          } else {
            logger.warn({ outboxId: row.id, eventName: row.eventName }, "Outbox relay: payload is null or not object, marking as terminal");
            await this.prisma.outboxModel.update({
              where: { id: row.id },
              data: { publishedAt: new Date() },
            });
            continue;
          }
        } else {
          payload = raw as object;
        }
        await this.eventPublisher.publish(row.eventName, payload);
        await this.prisma.outboxModel.update({
          where: { id: row.id },
          data: { publishedAt: new Date() },
        });
      } catch (err) {
        logger.warn({ err, outboxId: row.id, eventName: row.eventName }, "Outbox relay: publish failed, will retry");
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
