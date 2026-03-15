import { AppError } from "@pgic/shared";

export class CalendarNotFoundError extends AppError {
  override name = "CalendarNotFoundError";
  constructor(id: string) {
    super(`Calendar not found: ${id}`);
    Object.setPrototypeOf(this, CalendarNotFoundError.prototype);
  }
}

export class SlaPolicyNotFoundError extends AppError {
  override name = "SlaPolicyNotFoundError";
  constructor(id: string) {
    super(`SLA policy not found: ${id}`);
    Object.setPrototypeOf(this, SlaPolicyNotFoundError.prototype);
  }
}

export class InvalidTicketTypeError extends AppError {
  override name = "InvalidTicketTypeError";
  constructor(value: string) {
    super(`Invalid ticket type: ${value}. Expected incident or request.`);
    Object.setPrototypeOf(this, InvalidTicketTypeError.prototype);
  }
}

export class InvalidCriticalityFilterError extends AppError {
  override name = "InvalidCriticalityFilterError";
  constructor(value: string) {
    super(`Invalid criticality filter: ${value}`);
    Object.setPrototypeOf(this, InvalidCriticalityFilterError.prototype);
  }
}
