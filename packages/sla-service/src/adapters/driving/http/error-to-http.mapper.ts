import { createErrorToHttpMapper } from "@pgic/shared";
import {
  CalendarNotFoundError,
  SlaPolicyNotFoundError,
  InvalidTicketTypeError,
  InvalidCriticalityFilterError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [CalendarNotFoundError, 404],
  [SlaPolicyNotFoundError, 404],
  [InvalidTicketTypeError, 400],
  [InvalidCriticalityFilterError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
