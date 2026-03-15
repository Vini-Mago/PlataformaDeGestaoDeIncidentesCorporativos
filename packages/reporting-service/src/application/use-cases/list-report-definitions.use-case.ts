import type {
  IReportDefinitionRepository,
  ReportDefinitionListFilters,
} from "../ports/report-definition-repository.port";
import { InvalidReportTypeError } from "../errors";
import { VALID_REPORT_TYPES } from "../../domain/entities/report-definition.entity";

export function parseReportTypeFilter(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value).trim() || undefined;
}

export function parseReportTypeFilterOrThrow(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (VALID_REPORT_TYPES.includes(s as (typeof VALID_REPORT_TYPES)[number])) return s;
  throw new InvalidReportTypeError(s);
}

export class ListReportDefinitionsUseCase {
  constructor(private readonly reportDefinitionRepository: IReportDefinitionRepository) {}

  async execute(filters: { reportType?: string }) {
    const listFilters: ReportDefinitionListFilters = {
      ...(filters.reportType && { reportType: filters.reportType }),
    };
    return this.reportDefinitionRepository.list(listFilters);
  }
}
