import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { SlaPolicy } from "../../../domain/entities/sla-policy.entity";
import { VALID_TICKET_TYPES } from "../../../domain/entities/sla-policy.entity";
import type {
  ISlaPolicyRepository,
  CreateSlaPolicyInput,
  SlaPolicyListFilters,
} from "../../../application/ports/sla-policy-repository.port";

export class PrismaSlaPolicyRepository implements ISlaPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSlaPolicyInput): Promise<SlaPolicy> {
    const row = await this.prisma.slaPolicyModel.create({
      data: {
        name: input.name,
        ticketType: input.ticketType,
        criticality: input.criticality ?? null,
        serviceId: input.serviceId ?? null,
        clientId: input.clientId ?? null,
        responseMinutes: input.responseMinutes,
        resolutionMinutes: input.resolutionMinutes,
        calendarId: input.calendarId,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    return this.toSlaPolicy(row);
  }

  async findById(id: string): Promise<SlaPolicy | null> {
    const row = await this.prisma.slaPolicyModel.findUnique({ where: { id } });
    return row ? this.toSlaPolicy(row) : null;
  }

  async list(filters: SlaPolicyListFilters = {}): Promise<SlaPolicy[]> {
    const rows = await this.prisma.slaPolicyModel.findMany({
      where: {
        ...(filters.ticketType && { ticketType: filters.ticketType }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => this.toSlaPolicy(r));
  }

  private parseTicketType(value: string): "incident" | "request" {
    if (VALID_TICKET_TYPES.includes(value as "incident" | "request")) {
      return value as "incident" | "request";
    }
    throw new Error(`Invalid ticket type in database: "${value}"`);
  }

  private toSlaPolicy(row: {
    id: string;
    name: string;
    ticketType: string;
    criticality: string | null;
    serviceId: string | null;
    clientId: string | null;
    responseMinutes: number;
    resolutionMinutes: number;
    calendarId: string;
    priority: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SlaPolicy {
    return {
      id: row.id,
      name: row.name,
      ticketType: this.parseTicketType(row.ticketType),
      criticality: row.criticality,
      serviceId: row.serviceId,
      clientId: row.clientId,
      responseMinutes: row.responseMinutes,
      resolutionMinutes: row.resolutionMinutes,
      calendarId: row.calendarId,
      priority: row.priority,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
