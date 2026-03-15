import { AppError } from "@pgic/shared";

export class IncidentNotFoundError extends AppError {
  override name = "IncidentNotFoundError";
  constructor(id: string) {
    super(`Incident not found: ${id}`);
    Object.setPrototypeOf(this, IncidentNotFoundError.prototype);
  }
}

export class InvalidStatusTransitionError extends AppError {
  override name = "InvalidStatusTransitionError";
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
    Object.setPrototypeOf(this, InvalidStatusTransitionError.prototype);
  }
}

export class InvalidStatusFilterError extends AppError {
  override name = "InvalidStatusFilterError";
  constructor(value: string) {
    super(`Invalid status filter: ${value}`);
    Object.setPrototypeOf(this, InvalidStatusFilterError.prototype);
  }
}
