import { AppError } from "@pgic/shared";

export class ProblemNotFoundError extends AppError {
  override name = "ProblemNotFoundError";
  constructor(id: string) {
    super(`Problem not found: ${id}`);
    Object.setPrototypeOf(this, ProblemNotFoundError.prototype);
  }
}

export class ChangeNotFoundError extends AppError {
  override name = "ChangeNotFoundError";
  constructor(id: string) {
    super(`Change not found: ${id}`);
    Object.setPrototypeOf(this, ChangeNotFoundError.prototype);
  }
}

export class InvalidProblemStatusFilterError extends AppError {
  override name = "InvalidProblemStatusFilterError";
  constructor(value: string) {
    super(`Invalid problem status filter: ${value}`);
    Object.setPrototypeOf(this, InvalidProblemStatusFilterError.prototype);
  }
}

export class InvalidChangeStatusFilterError extends AppError {
  override name = "InvalidChangeStatusFilterError";
  constructor(value: string) {
    super(`Invalid change status filter: ${value}`);
    Object.setPrototypeOf(this, InvalidChangeStatusFilterError.prototype);
  }
}

export class InvalidChangeRiskFilterError extends AppError {
  override name = "InvalidChangeRiskFilterError";
  constructor(value: string) {
    super(`Invalid change risk filter: ${value}`);
    Object.setPrototypeOf(this, InvalidChangeRiskFilterError.prototype);
  }
}
