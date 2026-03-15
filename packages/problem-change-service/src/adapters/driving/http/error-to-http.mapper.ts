import { createErrorToHttpMapper } from "@pgic/shared";
import {
  ProblemNotFoundError,
  ChangeNotFoundError,
  InvalidProblemStatusFilterError,
  InvalidChangeStatusFilterError,
  InvalidChangeRiskFilterError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [ProblemNotFoundError, 404],
  [ChangeNotFoundError, 404],
  [InvalidProblemStatusFilterError, 400],
  [InvalidChangeStatusFilterError, 400],
  [InvalidChangeRiskFilterError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
