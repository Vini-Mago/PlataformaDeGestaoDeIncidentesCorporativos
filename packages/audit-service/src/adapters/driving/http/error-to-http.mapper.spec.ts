import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import { AuditEntryNotFoundError } from "../../../application/errors";

describe("mapApplicationErrorToHttp (audit-service)", () => {
  it("maps AuditEntryNotFoundError to 404", () => {
    const err = new AuditEntryNotFoundError("entry-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Audit entry not found: entry-123");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
