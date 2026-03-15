import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  EscalationRuleNotFoundError,
  InvalidTicketTypeError,
  InvalidConditionTypeError,
  InvalidActionError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (escalation-service)", () => {
  it("maps EscalationRuleNotFoundError to 404", () => {
    const err = new EscalationRuleNotFoundError("rule-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Escalation rule not found: rule-123");
  });

  it("maps InvalidTicketTypeError to 400", () => {
    const err = new InvalidTicketTypeError("invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Invalid ticket type");
  });

  it("maps InvalidConditionTypeError to 400", () => {
    const err = new InvalidConditionTypeError("bad_type");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid condition type: bad_type");
  });

  it("maps InvalidActionError to 400", () => {
    const err = new InvalidActionError("bad_action");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid action: bad_action");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
