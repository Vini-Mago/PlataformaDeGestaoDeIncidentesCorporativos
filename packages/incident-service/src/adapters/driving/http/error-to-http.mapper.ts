import { createErrorToHttpMapper } from "@pgic/shared";
import {
  IncidentNotFoundError,
  InvalidStatusTransitionError,
  InvalidStatusFilterError,
  IncidentForbiddenError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [IncidentNotFoundError, 404],
  [InvalidStatusTransitionError, 400],
  [InvalidStatusFilterError, 400],
  [IncidentForbiddenError, 403],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
