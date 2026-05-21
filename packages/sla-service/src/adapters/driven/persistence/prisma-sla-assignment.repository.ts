import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  CreateSlaAssignmentInput,
  ISlaAssignmentRepository,
  SlaAssignmentRecord,
  IOutboxWriter,
} from "../../../application/ports/sla-assignment-repository.port";

export class PrismaSlaAssignmentRepository implements ISlaAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSlaAssignmentInput): Promise<SlaAssignmentRecord> {
    const row = await this.prisma.slaAssignmentModel.create({
      data: {
        ticketId: input.ticketId,
        ticketType: input.ticketType,
        policyId: input.policyId,
        responseDeadline: input.responseDeadline,
        resolutionDeadline: input.resolutionDeadline,
        clockStartedAt: input.clockStartedAt,
        status: "active",
      },
    });
    return this.toRecord(row);
  }

  async findByTicket(ticketId: string, ticketType: string): Promise<SlaAssignmentRecord | null> {
    const row = await this.prisma.slaAssignmentModel.findUnique({
      where: { ticketId_ticketType: { ticketId, ticketType } },
    });
    return row ? this.toRecord(row) : null;
  }

  async listActive(): Promise<SlaAssignmentRecord[]> {
    const rows = await this.prisma.slaAssignmentModel.findMany({
      where: { status: "active" },
    });
    return rows.map((r) => this.toRecord(r));
  }

  async setStatus(
    ticketId: string,
    ticketType: string,
    status: SlaAssignmentRecord["status"]
  ): Promise<void> {
    await this.prisma.slaAssignmentModel.update({
      where: { ticketId_ticketType: { ticketId, ticketType } },
      data: { status },
    });
  }

  async markRiskEmitted(id: string): Promise<void> {
    await this.prisma.slaAssignmentModel.update({
      where: { id },
      data: { riskEmitted: true },
    });
  }

  async markResponseBreachEmitted(id: string): Promise<void> {
    await this.prisma.slaAssignmentModel.update({
      where: { id },
      data: { responseBreachEmitted: true },
    });
  }

  async markResolutionBreachEmitted(id: string): Promise<void> {
    await this.prisma.slaAssignmentModel.update({
      where: { id },
      data: { resolutionBreachEmitted: true },
    });
  }

  private toRecord(row: {
    id: string;
    ticketId: string;
    ticketType: string;
    policyId: string;
    responseDeadline: Date;
    resolutionDeadline: Date;
    clockStartedAt: Date;
    status: string;
    riskEmitted: boolean;
    responseBreachEmitted: boolean;
    resolutionBreachEmitted: boolean;
  }): SlaAssignmentRecord {
    return {
      id: row.id,
      ticketId: row.ticketId,
      ticketType: row.ticketType,
      policyId: row.policyId,
      responseDeadline: row.responseDeadline,
      resolutionDeadline: row.resolutionDeadline,
      clockStartedAt: row.clockStartedAt,
      status: row.status as SlaAssignmentRecord["status"],
      riskEmitted: row.riskEmitted,
      responseBreachEmitted: row.responseBreachEmitted,
      resolutionBreachEmitted: row.resolutionBreachEmitted,
    };
  }
}

export class PrismaSlaOutboxWriter implements IOutboxWriter {
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
