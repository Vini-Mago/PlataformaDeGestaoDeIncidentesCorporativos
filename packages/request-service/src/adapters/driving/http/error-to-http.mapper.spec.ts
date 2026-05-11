import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  CatalogItemNotFoundError,
  ServiceRequestNotFoundError,
  InvalidStatusTransitionError,
  InvalidStatusFilterError,
  ServiceRequestForbiddenError,
  ServiceRequestApproverRoleForbiddenError,
  ServiceRequestSequentialApprovalTurnError,
  ServiceRequestParallelApprovalDuplicateError,
  FormDataValidationError,
  InvalidCatalogFormSchemaError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (request-service)", () => {
  it("maps CatalogItemNotFoundError to 404", () => {
    const err = new CatalogItemNotFoundError("cat-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Catalog item not found: cat-123");
  });

  it("maps ServiceRequestNotFoundError to 404", () => {
    const err = new ServiceRequestNotFoundError("req-456");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Service request not found: req-456");
  });

  it("maps InvalidStatusTransitionError to 400", () => {
    const err = new InvalidStatusTransitionError("Submitted", "Completed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid status transition from Submitted to Completed");
  });

  it("maps InvalidStatusFilterError to 400", () => {
    const err = new InvalidStatusFilterError("InvalidStatus");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid status filter: InvalidStatus");
  });

  it("maps ServiceRequestForbiddenError to 403", () => {
    const err = new ServiceRequestForbiddenError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("Forbidden");
  });

  it("maps ServiceRequestApproverRoleForbiddenError to 403", () => {
    const err = new ServiceRequestApproverRoleForbiddenError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toContain("role");
  });

  it("maps ServiceRequestSequentialApprovalTurnError to 403", () => {
    const err = new ServiceRequestSequentialApprovalTurnError("gestor");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toContain("gestor");
  });

  it("maps ServiceRequestParallelApprovalDuplicateError to 400", () => {
    const err = new ServiceRequestParallelApprovalDuplicateError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("already");
  });

  it("maps FormDataValidationError to 400", () => {
    const err = new FormDataValidationError(["/reason: required"]);
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("reason");
  });

  it("maps InvalidCatalogFormSchemaError to 500", () => {
    const err = new InvalidCatalogFormSchemaError("bad");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toContain("formSchema");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
