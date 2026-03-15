import { createErrorToHttpMapper } from "@pgic/shared";
import {
  ReportDefinitionNotFoundError,
  InvalidReportTypeError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [ReportDefinitionNotFoundError, 404],
  [InvalidReportTypeError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
