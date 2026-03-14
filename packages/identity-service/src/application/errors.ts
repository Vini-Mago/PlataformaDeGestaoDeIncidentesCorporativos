/**
 * Application/domain errors for identity service.
 * Extend AppError from shared so instanceof and serialization work consistently.
 */

import { AppError } from "@pgic/shared";

export class UserAlreadyExistsError extends AppError {
  override name = "UserAlreadyExistsError";
  constructor(message = "User with this email already exists") {
    super(message);
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

export class InvalidCredentialsError extends AppError {
  override name = "InvalidCredentialsError";
  constructor(message = "Invalid email or password") {
    super(message);
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class InvalidNameError extends AppError {
  override name = "InvalidNameError";
  constructor(message = "Name cannot be empty") {
    super(message);
    Object.setPrototypeOf(this, InvalidNameError.prototype);
  }
}

export class InvalidEmailError extends AppError {
  override name = "InvalidEmailError";
  constructor(message = "Invalid email") {
    super(message);
    Object.setPrototypeOf(this, InvalidEmailError.prototype);
  }
}

export class PasswordValidationError extends AppError {
  override name = "PasswordValidationError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, PasswordValidationError.prototype);
  }
}

export class UserNotFoundError extends AppError {
  override name = "UserNotFoundError";
  constructor(id: string) {
    super(`User not found: ${id}`);
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class InvalidUserIdError extends AppError {
  override name = "InvalidUserIdError";
  constructor(message = "Invalid user id format") {
    super(message);
    Object.setPrototypeOf(this, InvalidUserIdError.prototype);
  }
}
