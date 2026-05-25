import { logger } from "@pgic/shared";
import { randomUUID } from "crypto";
import type { PrismaClient } from "../../../../generated/prisma-client/index";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";
import { INTEGRATION_OUTBOUND_DISPATCH_EVENT } from "../../../application/use-cases/create-outbound-delivery.use-case";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 2_000;
const RETRY_BASE_BACKOFF_MS = 1_000;
const RETRY_MAX_BACKOFF_MS = 60_000;

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

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function computeRetryBackoffMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  const backoff = RETRY_BASE_BACKOFF_MS * 2 ** exponent;
  return Math.min(RETRY_MAX_BACKOFF_MS, backoff);
}

export class OutboxRelayAdapter {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: Pick<IEventPublisher, "publish">,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  private async processOutboundDispatch(outboxId: string, payloadObj: Record<string, unknown>): Promise<void> {
    const endpoint = typeof payloadObj.endpoint === "string" ? payloadObj.endpoint : null;
    const method = typeof payloadObj.method === "string" ? payloadObj.method.toUpperCase() : "POST";
    const timeoutMsRaw = typeof payloadObj.timeoutMs === "number" ? payloadObj.timeoutMs : 5_000;
    const timeoutMs = Math.max(500, Math.min(30_000, Math.trunc(timeoutMsRaw)));
    const maxAttemptsRaw = typeof payloadObj.maxAttempts === "number" ? payloadObj.maxAttempts : 3;
    const maxAttempts = Math.max(1, Math.min(5, Math.trunc(maxAttemptsRaw)));
    const attemptRaw = typeof payloadObj.attempt === "number" ? payloadObj.attempt : 1;
    const attempt = Math.max(1, Math.trunc(attemptRaw));

    if (!endpoint) {
      await this.prisma.outboxModel.update({
        where: { id: outboxId },
        data: { failedAt: new Date(), terminalError: "Missing endpoint on outbound payload" },
      });
      return;
    }

    const correlationId = typeof payloadObj.correlationId === "string" ? payloadObj.correlationId : null;
    const externalId = typeof payloadObj.externalId === "string" ? payloadObj.externalId : null;
    const headersRaw = asRecord(payloadObj.headers) ?? {};
    const headers = Object.fromEntries(
      Object.entries(headersRaw).filter(([, value]) => typeof value === "string")
    ) as Record<string, string>;
    const requestBody = asRecord(payloadObj.payload);
    const methodAllowsBody = method === "POST" || method === "PUT" || method === "PATCH";
    const hasRequestBody = requestBody != null && Object.keys(requestBody).length > 0;
    const body = methodAllowsBody && hasRequestBody ? JSON.stringify(requestBody) : undefined;

    const startedAt = Date.now();
    let statusCode: number | null = null;
    try {
      const signal = AbortSignal.timeout(timeoutMs);
      const response = await fetch(endpoint, {
        method,
        headers: body == null ? headers : { "content-type": "application/json", ...headers },
        body,
        signal,
      });
      statusCode = response.status;
      if (!response.ok) {
        throw new Error(`Outbound integration returned HTTP ${response.status}`);
      }

      await this.prisma.integrationLogModel.create({
        data: {
          direction: "outbound",
          endpoint,
          httpStatus: response.status,
          correlationId,
          externalId,
          payloadSummary: {
            attempt,
            maxAttempts,
            method,
            deliveryId: payloadObj.deliveryId ?? null,
          },
          durationMs: Date.now() - startedAt,
        },
      });

      await this.prisma.outboxModel.update({
        where: { id: outboxId },
        data: { publishedAt: new Date() },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown outbound integration error";
      await this.prisma.integrationLogModel.create({
        data: {
          direction: "outbound",
          endpoint,
          httpStatus: statusCode,
          correlationId,
          externalId,
          payloadSummary: {
            attempt,
            maxAttempts,
            method,
            deliveryId: payloadObj.deliveryId ?? null,
          },
          errorMessage,
          durationMs: Date.now() - startedAt,
        },
      });

      if (attempt < maxAttempts) {
        const backoffMs = computeRetryBackoffMs(attempt);
        const nextAttemptAt = new Date(Date.now() + backoffMs);
        const claimAt = new Date(nextAttemptAt.getTime() - 5 * 60 * 1000);
        await this.prisma.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: INTEGRATION_OUTBOUND_DISPATCH_EVENT,
            payload: {
              ...payloadObj,
              attempt: attempt + 1,
              lastError: errorMessage,
              backoffMs,
              nextAttemptAt: nextAttemptAt.toISOString(),
            } as object,
            claimedAt: claimAt,
          },
        });
        await this.prisma.outboxModel.update({
          where: { id: outboxId },
          data: { publishedAt: new Date() },
        });
        return;
      }

      await this.prisma.integrationDlqModel.create({
        data: {
          eventName: INTEGRATION_OUTBOUND_DISPATCH_EVENT,
          payload: payloadObj as object,
          errorMessage,
        },
      });
      await this.prisma.outboxModel.update({
        where: { id: outboxId },
        data: { failedAt: new Date(), terminalError: errorMessage },
      });
    }
  }

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
        if (row.event_name === INTEGRATION_OUTBOUND_DISPATCH_EVENT) {
          await this.processOutboundDispatch(row.id, payload as Record<string, unknown>);
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
