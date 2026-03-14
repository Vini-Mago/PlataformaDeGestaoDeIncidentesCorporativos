import { createErrorToHttpMapper } from "@pgic/shared";
import {
  CatalogItemNotFoundError,
  ServiceRequestNotFoundError,
  InvalidStatusTransitionError,
} from "../../../application/errors";

type ErrorCtor = new (...args: unknown[]) => Error;
const map = createErrorToHttpMapper([
  [CatalogItemNotFoundError as unknown as ErrorCtor, 404],
  [ServiceRequestNotFoundError as unknown as ErrorCtor, 404],
  [InvalidStatusTransitionError as unknown as ErrorCtor, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } | null {
  return map(error);
}
