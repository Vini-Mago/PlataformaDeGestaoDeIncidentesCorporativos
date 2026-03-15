import { createErrorToHttpMapper } from "@pgic/shared";
import {
  IncidentNotFoundError,
  InvalidStatusTransitionError,
  InvalidStatusFilterError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [IncidentNotFoundError, 404],
  [InvalidStatusTransitionError, 400],
  [InvalidStatusFilterError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
