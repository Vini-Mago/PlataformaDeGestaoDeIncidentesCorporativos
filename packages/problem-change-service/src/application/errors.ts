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

export class InvalidProblemStatusTransitionError extends AppError {
  override name = "InvalidProblemStatusTransitionError";
  constructor(from: string, to: string) {
    super(`Invalid problem status transition: ${from} -> ${to}`);
    Object.setPrototypeOf(this, InvalidProblemStatusTransitionError.prototype);
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

export class ProblemForbiddenError extends AppError {
  override name = "ProblemForbiddenError";
  constructor() {
    super("Forbidden");
    Object.setPrototypeOf(this, ProblemForbiddenError.prototype);
  }
}

export class ChangeForbiddenError extends AppError {
  override name = "ChangeForbiddenError";
  constructor() {
    super("Forbidden");
    Object.setPrototypeOf(this, ChangeForbiddenError.prototype);
  }
}

export class InvalidChangeStatusTransitionError extends AppError {
  override name = "InvalidChangeStatusTransitionError";
  constructor(from: string, to: string) {
    super(`Invalid change status transition: ${from} -> ${to}`);
    Object.setPrototypeOf(this, InvalidChangeStatusTransitionError.prototype);
  }
}

export class ChangeExecutionOutsideWindowError extends AppError {
  override name = "ChangeExecutionOutsideWindowError";
  constructor() {
    super("Change execution is only allowed within the scheduled window");
    Object.setPrototypeOf(this, ChangeExecutionOutsideWindowError.prototype);
  }
}

export class ChangeExecutionWindowRequiredError extends AppError {
  override name = "ChangeExecutionWindowRequiredError";
  constructor() {
    super("windowStart and windowEnd are required before moving to InProgress");
    Object.setPrototypeOf(this, ChangeExecutionWindowRequiredError.prototype);
  }
}

export class ChangeContentLockedError extends AppError {
  override name = "ChangeContentLockedError";
  constructor() {
    super("Change title, description, justification, type and risk can only be edited while status is Draft");
    Object.setPrototypeOf(this, ChangeContentLockedError.prototype);
  }
}

export class ChangeSchedulingLockedError extends AppError {
  override name = "ChangeSchedulingLockedError";
  constructor() {
    super("Window and rollback plan cannot be edited after execution has started");
    Object.setPrototypeOf(this, ChangeSchedulingLockedError.prototype);
  }
}
