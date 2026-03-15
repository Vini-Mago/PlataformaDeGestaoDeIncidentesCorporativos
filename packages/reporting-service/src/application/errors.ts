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
