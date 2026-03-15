import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { ReportDefinition } from "../../../domain/entities/report-definition.entity";
import { VALID_REPORT_TYPES } from "../../../domain/entities/report-definition.entity";
import type {
  IReportDefinitionRepository,
  CreateReportDefinitionInput,
  ReportDefinitionListFilters,
} from "../../../application/ports/report-definition-repository.port";

export class PrismaReportDefinitionRepository implements IReportDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReportDefinitionInput): Promise<ReportDefinition> {
    const row = await this.prisma.reportDefinitionModel.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        reportType: input.reportType,
        filters: (input.filters ?? {}) as object,
      },
    });
    return this.toReportDefinition(row);
  }

  async findById(id: string): Promise<ReportDefinition | null> {
    const row = await this.prisma.reportDefinitionModel.findUnique({ where: { id } });
    return row ? this.toReportDefinition(row) : null;
  }

  async list(filters: ReportDefinitionListFilters = {}): Promise<ReportDefinition[]> {
    const rows = await this.prisma.reportDefinitionModel.findMany({
      where: {
        ...(filters.reportType && { reportType: filters.reportType }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toReportDefinition(r));
  }

  private parseReportType(value: string): ReportDefinition["reportType"] {
    if (VALID_REPORT_TYPES.includes(value as ReportDefinition["reportType"])) {
      return value as ReportDefinition["reportType"];
    }
    throw new Error(`Invalid report type in database: "${value}"`);
  }

  private toReportDefinition(row: {
    id: string;
    name: string;
    description: string | null;
    reportType: string;
    filters: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ReportDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: this.parseReportType(row.reportType),
      filters: (row.filters as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
