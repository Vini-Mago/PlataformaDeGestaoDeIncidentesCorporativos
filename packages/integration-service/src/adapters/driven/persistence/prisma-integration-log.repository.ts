import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  CreateIntegrationLogInput,
  IIntegrationLogRepository,
  IntegrationLogRecord,
} from "../../../application/ports/integration-log-repository.port";
import type { IOutboxWriter } from "../../../application/ports/outbox-writer.port";

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
        payloadSummary: (input.payloadSummary ?? undefined) as object | undefined,
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
    createdAt: Date;
  }): IntegrationLogRecord {
    return {
      id: row.id,
      direction: row.direction,
      endpoint: row.endpoint,
      httpStatus: row.httpStatus,
      correlationId: row.correlationId,
      externalId: row.externalId,
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
