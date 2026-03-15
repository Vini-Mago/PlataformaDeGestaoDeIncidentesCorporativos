import type { ReportDefinition } from "../../domain/entities/report-definition.entity";

export interface CreateReportDefinitionInput {
  name: string;
  description?: string | null;
  reportType: string;
  filters: Record<string, unknown>;
}

export interface ReportDefinitionListFilters {
  reportType?: string;
}

export interface IReportDefinitionRepository {
  create(input: CreateReportDefinitionInput): Promise<ReportDefinition>;
  findById(id: string): Promise<ReportDefinition | null>;
  list(filters?: ReportDefinitionListFilters): Promise<ReportDefinition[]>;
}
