import { AppError } from "@pgic/shared";

export class ReportDefinitionNotFoundError extends AppError {
  override name = "ReportDefinitionNotFoundError";
  constructor(id: string) {
    super(`Report definition not found: ${id}`);
    Object.setPrototypeOf(this, ReportDefinitionNotFoundError.prototype);
  }
}

export class InvalidReportTypeError extends AppError {
  override name = "InvalidReportTypeError";
  constructor(value: string) {
    super(`Invalid report type: ${value}`);
    Object.setPrototypeOf(this, InvalidReportTypeError.prototype);
  }
}

export class ReportExportJobNotFoundError extends AppError {
  override name = "ReportExportJobNotFoundError";
  constructor(id: string) {
    super(`Report export job not found: ${id}`);
    Object.setPrototypeOf(this, ReportExportJobNotFoundError.prototype);
  }
}

export class ReportExportJobNotReadyError extends AppError {
  override name = "ReportExportJobNotReadyError";
  constructor(id: string, status: string) {
    super(`Report export job ${id} is not ready for download (status: ${status})`);
    Object.setPrototypeOf(this, ReportExportJobNotReadyError.prototype);
  }
}

export class ReportExportJobForbiddenError extends AppError {
  override name = "ReportExportJobForbiddenError";
  constructor() {
    super("Forbidden");
    Object.setPrototypeOf(this, ReportExportJobForbiddenError.prototype);
  }
}
