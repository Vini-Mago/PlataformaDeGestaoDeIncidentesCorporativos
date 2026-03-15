import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  IncidentNotFoundError,
  InvalidStatusTransitionError,
  InvalidStatusFilterError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (incident-service)", () => {
  it("maps IncidentNotFoundError to 404", () => {
    const err = new IncidentNotFoundError("inc-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Incident not found: inc-123");
  });

  it("maps InvalidStatusTransitionError to 400", () => {
    const err = new InvalidStatusTransitionError("Open", "Completed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid status transition from Open to Completed");
  });

  it("maps InvalidStatusFilterError to 400", () => {
    const err = new InvalidStatusFilterError("InvalidStatus");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid status filter: InvalidStatus");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
