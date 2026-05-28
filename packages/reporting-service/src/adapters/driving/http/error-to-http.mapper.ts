import { createErrorToHttpMapper } from "@pgic/shared";
import {
  ReportDefinitionNotFoundError,
  InvalidReportTypeError,
  ReportExportJobForbiddenError,
  ReportExportJobNotFoundError,
  ReportExportJobNotReadyError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [ReportDefinitionNotFoundError, 404],
  [InvalidReportTypeError, 400],
  [ReportExportJobForbiddenError, 403],
  [ReportExportJobNotFoundError, 404],
  [ReportExportJobNotReadyError, 409],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
