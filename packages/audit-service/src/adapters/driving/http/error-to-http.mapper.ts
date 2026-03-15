import { createErrorToHttpMapper } from "@pgic/shared";
import { AuditEntryNotFoundError } from "../../../application/errors";

const map = createErrorToHttpMapper([
  [AuditEntryNotFoundError, 404],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
