import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  CalendarNotFoundError,
  SlaPolicyNotFoundError,
  InvalidTicketTypeError,
  InvalidCriticalityFilterError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (sla-service)", () => {
  it("maps CalendarNotFoundError to 404", () => {
    const err = new CalendarNotFoundError("cal-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Calendar not found: cal-123");
  });

  it("maps SlaPolicyNotFoundError to 404", () => {
    const err = new SlaPolicyNotFoundError("policy-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("SLA policy not found: policy-123");
  });

  it("maps InvalidTicketTypeError to 400", () => {
    const err = new InvalidTicketTypeError("invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Invalid ticket type");
  });

  it("maps InvalidCriticalityFilterError to 400", () => {
    const err = new InvalidCriticalityFilterError("Bad");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid criticality filter: Bad");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
