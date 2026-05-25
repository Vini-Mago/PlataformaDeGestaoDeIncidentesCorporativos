import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  CreateIntegrationLogInput,
  IIntegrationLogRepository,
  IntegrationLogRecord,
} from "../../../application/ports/integration-log-repository.port";
import type {
  IIntegrationDlqRepository,
  IntegrationDlqRecord,
  IntegrationDlqStatus,
  ListIntegrationDlqInput,
} from "../../../application/ports/integration-dlq-repository.port";
import type { IOutboxWriter } from "../../../application/ports/outbox-writer.port";
import { maskSensitivePayload } from "../../../infrastructure/mask-sensitive-payload";

function toPlainObject(raw: unknown): object {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return maskSensitivePayload(raw) as object;
}

export class PrismaIntegrationLogRepository implements IIntegrationLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateIntegrationLogInput): Promise<IntegrationLogRecord> {
    const row = await this.prisma.integrationLogModel.create({
      data: {
        direction: input.direction,
        endpoint: input.endpoint,
        httpStatus: input.httpStatus ?? null,
        correlationId: input.correlationId ?? null,
        externalId: input.externalId ?? null,
        payloadSummary:
          input.payloadSummary == null
            ? undefined
            : (maskSensitivePayload(input.payloadSummary) as object),
        errorMessage: input.errorMessage ?? null,
        durationMs: input.durationMs ?? null,
      },
    });
    return this.toRecord(row);
  }

  async list(limit = 50): Promise<IntegrationLogRecord[]> {
    const rows = await this.prisma.integrationLogModel.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });
    return rows.map((r) => this.toRecord(r));
  }

  private toRecord(row: {
    id: string;
    direction: string;
    endpoint: string;
    httpStatus: number | null;
    correlationId: string | null;
    externalId: string | null;
    payloadSummary?: unknown;
    errorMessage?: string | null;
    durationMs?: number | null;
    createdAt: Date;
  }): IntegrationLogRecord {
    return {
      id: row.id,
      direction: row.direction,
      endpoint: row.endpoint,
      httpStatus: row.httpStatus,
      correlationId: row.correlationId,
      externalId: row.externalId,
      payloadSummary: row.payloadSummary == null ? null : toPlainObject(row.payloadSummary),
      errorMessage: row.errorMessage ?? null,
      durationMs: row.durationMs ?? null,
      createdAt: row.createdAt,
    };
  }
}

export class PrismaIntegrationDlqRepository implements IIntegrationDlqRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: ListIntegrationDlqInput = {}): Promise<IntegrationDlqRecord[]> {
    const status: IntegrationDlqStatus = input.status ?? "pending";
    const rows = await this.prisma.integrationDlqModel.findMany({
      where:
        status === "all"
          ? undefined
          : { reprocessedAt: status === "pending" ? null : { not: null } },
      orderBy: { createdAt: "desc" },
      take: Math.min(input.limit ?? 50, 200),
    });
    return rows.map((row) => this.toRecord(row));
  }

  async findById(id: string): Promise<IntegrationDlqRecord | null> {
    const row = await this.prisma.integrationDlqModel.findUnique({ where: { id } });
    return row ? this.toRecord(row) : null;
  }

  async markReprocessed(id: string, reprocessedAt: Date): Promise<IntegrationDlqRecord> {
    const row = await this.prisma.integrationDlqModel.update({
      where: { id },
      data: { reprocessedAt },
    });
    return this.toRecord(row);
  }

  private toRecord(row: {
    id: string;
    eventName: string;
    payload: unknown;
    errorMessage: string;
    reprocessedAt: Date | null;
    createdAt: Date;
  }): IntegrationDlqRecord {
    return {
      id: row.id,
      eventName: row.eventName,
      payload: toPlainObject(row.payload),
      errorMessage: row.errorMessage,
      reprocessedAt: row.reprocessedAt,
      createdAt: row.createdAt,
    };
  }
}

export class PrismaOutboxWriter implements IOutboxWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue(eventName: string, payload: object): Promise<void> {
    await this.prisma.outboxModel.create({
      data: {
        id: randomUUID(),
        eventName,
        payload: payload as object,
      },
    });
  }
}
