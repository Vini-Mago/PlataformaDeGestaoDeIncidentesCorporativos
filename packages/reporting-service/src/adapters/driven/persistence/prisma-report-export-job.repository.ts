import { Prisma, PrismaClient } from "../../../../generated/prisma-client";
import type {
  CreateReportExportJobInput,
  IReportExportJobRepository,
} from "../../../application/ports/report-export-job-repository.port";
import type { ReportExportJob, ReportExportJobStatus } from "../../../domain/entities/report-export-job.entity";

export class PrismaReportExportJobRepository implements IReportExportJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReportExportJobInput): Promise<ReportExportJob> {
    const row = await this.prisma.reportExportJobModel.create({
      data: {
        requestedById: input.requestedById,
        reportType: input.reportType,
        filters: input.filters as Prisma.InputJsonValue,
        status: "pending",
        format: input.format,
      },
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<ReportExportJob | null> {
    const row = await this.prisma.reportExportJobModel.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async updateStatus(
    id: string,
    status: ReportExportJobStatus,
    patch?: {
      fileContent?: string | null;
      fileName?: string | null;
      errorMessage?: string | null;
      completedAt?: Date | null;
    }
  ): Promise<void> {
    await this.prisma.reportExportJobModel.update({
      where: { id },
      data: {
        status,
        ...(patch?.fileContent !== undefined && { fileContent: patch.fileContent }),
        ...(patch?.fileName !== undefined && { fileName: patch.fileName }),
        ...(patch?.errorMessage !== undefined && { errorMessage: patch.errorMessage }),
        ...(patch?.completedAt !== undefined && { completedAt: patch.completedAt }),
      },
    });
  }

  private toEntity(row: {
    id: string;
    requestedById: string;
    reportType: string | null;
    filters: unknown;
    status: string;
    format: string;
    fileContent: string | null;
    fileName: string | null;
    errorMessage: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReportExportJob {
    return {
      id: row.id,
      requestedById: row.requestedById,
      reportType: row.reportType,
      filters: (row.filters as Record<string, unknown>) ?? {},
      status: row.status as ReportExportJobStatus,
      format: "csv",
      fileContent: row.fileContent,
      fileName: row.fileName,
      errorMessage: row.errorMessage,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
