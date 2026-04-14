import { createErrorToHttpMapper } from "@pgic/shared";
import {
  UserAlreadyExistsError,
  UserNotFoundError,
  InvalidUserIdError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidNameError,
  PasswordValidationError,
  UserInactiveError,
  InvalidRefreshTokenError,
  ExpiredRefreshTokenError,
  InvalidPasswordResetTokenError,
  ForbiddenError,
} from "../../../application/errors";

/**
 * Maps application/domain errors to HTTP responses (status + message).
 * Centralizes rules in one place (SRP); controllers only orchestrate.
 */
export const mapApplicationErrorToHttp = createErrorToHttpMapper([
  [UserAlreadyExistsError, 409],
  [UserNotFoundError, 404],
  [InvalidUserIdError, 400],
  [InvalidCredentialsError, 401],
  [UserInactiveError, 403],
  [InvalidEmailError, 400],
  [InvalidNameError, 400],
  [PasswordValidationError, 400],
  [InvalidRefreshTokenError, 401],
  [ExpiredRefreshTokenError, 401],
  [InvalidPasswordResetTokenError, 400],
  [ForbiddenError, 403],
]);
