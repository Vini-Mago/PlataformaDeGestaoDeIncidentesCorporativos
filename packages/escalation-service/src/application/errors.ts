import { AppError } from "@pgic/shared";

export class EscalationRuleNotFoundError extends AppError {
  override name = "EscalationRuleNotFoundError";
  constructor(id: string) {
    super(`Escalation rule not found: ${id}`);
    Object.setPrototypeOf(this, EscalationRuleNotFoundError.prototype);
  }
}

export class InvalidTicketTypeError extends AppError {
  override name = "InvalidTicketTypeError";
  constructor(value: string) {
    super(`Invalid ticket type: ${value}. Expected incident or request.`);
    Object.setPrototypeOf(this, InvalidTicketTypeError.prototype);
  }
}

export class InvalidConditionTypeError extends AppError {
  override name = "InvalidConditionTypeError";
  constructor(value: string) {
    super(`Invalid condition type: ${value}`);
    Object.setPrototypeOf(this, InvalidConditionTypeError.prototype);
  }
}

export class InvalidActionError extends AppError {
  override name = "InvalidActionError";
  constructor(value: string) {
    super(`Invalid action: ${value}`);
    Object.setPrototypeOf(this, InvalidActionError.prototype);
  }
}
