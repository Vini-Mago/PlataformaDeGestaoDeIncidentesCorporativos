import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { EscalationRule } from "../../../domain/entities/escalation-rule.entity";
import { VALID_TICKET_TYPES, VALID_CONDITION_TYPES, VALID_ACTIONS } from "../../../domain/entities/escalation-rule.entity";
import type {
  IEscalationRuleRepository,
  CreateEscalationRuleInput,
  EscalationRuleListFilters,
} from "../../../application/ports/escalation-rule-repository.port";

export class PrismaEscalationRuleRepository implements IEscalationRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateEscalationRuleInput): Promise<EscalationRule> {
    const row = await this.prisma.escalationRuleModel.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        ticketType: input.ticketType,
        conditionType: input.conditionType,
        conditionValue: input.conditionValue,
        actions: input.actions,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    return this.toEscalationRule(row);
  }

  async findById(id: string): Promise<EscalationRule | null> {
    const row = await this.prisma.escalationRuleModel.findUnique({ where: { id } });
    return row ? this.toEscalationRule(row) : null;
  }

  async list(filters: EscalationRuleListFilters = {}): Promise<EscalationRule[]> {
    const rows = await this.prisma.escalationRuleModel.findMany({
      where: {
        ...(filters.ticketType && { ticketType: filters.ticketType }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => this.toEscalationRule(r));
  }

  private parseTicketType(value: string): "incident" | "request" {
    if (VALID_TICKET_TYPES.includes(value as "incident" | "request")) {
      return value as "incident" | "request";
    }
    throw new Error(`Invalid ticket type in database: "${value}"`);
  }

  private parseConditionType(value: string): EscalationRule["conditionType"] {
    if (VALID_CONDITION_TYPES.includes(value as EscalationRule["conditionType"])) {
      return value as EscalationRule["conditionType"];
    }
    throw new Error(`Invalid condition type in database: "${value}"`);
  }

  private parseActions(values: string[]): EscalationRule["actions"] {
    const invalid = values.filter(
      (v) => !VALID_ACTIONS.includes(v as EscalationRule["actions"][number])
    );
    if (invalid.length > 0) {
      throw new Error(`Invalid escalation action(s) in database: ${invalid.join(", ")}`);
    }
    return values as EscalationRule["actions"];
  }

  private toEscalationRule(row: {
    id: string;
    name: string;
    description: string | null;
    ticketType: string;
    conditionType: string;
    conditionValue: string;
    actions: string[];
    priority: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): EscalationRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ticketType: this.parseTicketType(row.ticketType),
      conditionType: this.parseConditionType(row.conditionType),
      conditionValue: row.conditionValue,
      actions: this.parseActions(row.actions),
      priority: row.priority,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
