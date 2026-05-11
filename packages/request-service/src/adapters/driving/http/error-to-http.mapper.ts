import { createErrorToHttpMapper } from "@pgic/shared";
import {
  CatalogItemNotFoundError,
  ServiceRequestNotFoundError,
  InvalidStatusTransitionError,
  InvalidStatusFilterError,
  ServiceRequestForbiddenError,
  ServiceRequestApproverRoleForbiddenError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [CatalogItemNotFoundError, 404],
  [ServiceRequestNotFoundError, 404],
  [InvalidStatusTransitionError, 400],
  [InvalidStatusFilterError, 400],
  [ServiceRequestForbiddenError, 403],
  [ServiceRequestApproverRoleForbiddenError, 403],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
