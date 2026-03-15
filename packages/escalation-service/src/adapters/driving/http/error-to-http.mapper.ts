import { createErrorToHttpMapper } from "@pgic/shared";
import {
  EscalationRuleNotFoundError,
  InvalidTicketTypeError,
  InvalidConditionTypeError,
  InvalidActionError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [EscalationRuleNotFoundError, 404],
  [InvalidTicketTypeError, 400],
  [InvalidConditionTypeError, 400],
  [InvalidActionError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
