import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateReportDefinitionUseCase } from "../../../application/use-cases/create-report-definition.use-case";
import type { ListReportDefinitionsUseCase } from "../../../application/use-cases/list-report-definitions.use-case";
import type { GetReportDefinitionUseCase } from "../../../application/use-cases/get-report-definition.use-case";
import { parseReportTypeFilterOrThrow } from "../../../application/use-cases/list-report-definitions.use-case";
import { asyncHandler } from "@pgic/shared";
import { createReportDefinitionSchema } from "../../../application/dtos/create-report-definition.dto";
import type { ReportDefinition } from "../../../domain/entities/report-definition.entity";

function csvEscape(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function reportDefinitionsToCsv(items: ReportDefinition[]): string {
  const header = ["id", "name", "description", "reportType", "filters", "createdAt", "updatedAt"];
  const rows = items.map((item) =>
    [
      item.id,
      item.name,
      item.description,
      item.reportType,
      JSON.stringify(item.filters),
      item.createdAt,
      item.updatedAt,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export class ReportingController {
  constructor(
    private readonly createReportDefinition: CreateReportDefinitionUseCase,
    private readonly listReportDefinitions: ListReportDefinitionsUseCase,
    private readonly getReportDefinition: GetReportDefinitionUseCase
  ) {}

  createReportDefinitionHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createReportDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation error",
        message: parsed.error.errors.map((e) => e.message).join("; "),
      });
      return;
    }
    const report = await this.createReportDefinition.execute(parsed.data);
    res.status(201).json(report);
  });

  listReportDefinitionsHandler = asyncHandler(async (req: Request, res: Response) => {
    const reportType = parseReportTypeFilterOrThrow(req.query.reportType);
    const list = await this.listReportDefinitions.execute({ reportType });
    res.json(list);
  });

  exportReportDefinitionsCsvHandler = asyncHandler(async (req: Request, res: Response) => {
    const reportType = parseReportTypeFilterOrThrow(req.query.reportType);
    const list = await this.listReportDefinitions.execute({ reportType });
    res
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader("Content-Disposition", 'attachment; filename="report-definitions.csv"')
      .send(reportDefinitionsToCsv(list));
  });

  getReportDefinitionHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const report = await this.getReportDefinition.execute(id);
    res.json(report);
  });
}
