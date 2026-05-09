import { createErrorToHttpMapper } from "@pgic/shared";
import {
  ProblemNotFoundError,
  ChangeNotFoundError,
  InvalidProblemStatusFilterError,
  InvalidProblemStatusTransitionError,
  InvalidChangeStatusFilterError,
  InvalidChangeRiskFilterError,
  ProblemForbiddenError,
  ChangeForbiddenError,
  InvalidChangeStatusTransitionError,
  ChangeExecutionOutsideWindowError,
  ChangeExecutionWindowRequiredError,
  ChangeContentLockedError,
  ChangeSchedulingLockedError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [ProblemNotFoundError, 404],
  [ChangeNotFoundError, 404],
  [InvalidProblemStatusFilterError, 400],
  [InvalidProblemStatusTransitionError, 400],
  [InvalidChangeStatusFilterError, 400],
  [InvalidChangeRiskFilterError, 400],
  [InvalidChangeStatusTransitionError, 400],
  [ChangeExecutionOutsideWindowError, 400],
  [ChangeExecutionWindowRequiredError, 400],
  [ChangeContentLockedError, 400],
  [ChangeSchedulingLockedError, 400],
  [ProblemForbiddenError, 403],
  [ChangeForbiddenError, 403],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
