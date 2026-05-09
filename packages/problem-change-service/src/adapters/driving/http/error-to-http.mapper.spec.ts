import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  ProblemNotFoundError,
  ChangeNotFoundError,
  InvalidProblemStatusFilterError,
  InvalidProblemStatusTransitionError,
  InvalidChangeStatusFilterError,
  InvalidChangeRiskFilterError,
  ProblemForbiddenError,
  ChangeForbiddenError,
  InvalidChangeStatusTransitionError,
  ChangeExecutionOutsideWindowError,
  ChangeExecutionWindowRequiredError,
  ChangeContentLockedError,
  ChangeSchedulingLockedError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (problem-change-service)", () => {
  it("maps ProblemNotFoundError to 404", () => {
    const err = new ProblemNotFoundError("prob-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Problem not found: prob-123");
  });

  it("maps ChangeNotFoundError to 404", () => {
    const err = new ChangeNotFoundError("chg-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Change not found: chg-123");
  });

  it("maps InvalidProblemStatusFilterError to 400", () => {
    const err = new InvalidProblemStatusFilterError("Invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid problem status filter: Invalid");
  });

  it("maps InvalidProblemStatusTransitionError to 400", () => {
    const err = new InvalidProblemStatusTransitionError("Closed", "Resolved");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid problem status transition: Closed -> Resolved");
  });

  it("maps InvalidChangeStatusFilterError to 400", () => {
    const err = new InvalidChangeStatusFilterError("Invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid change status filter: Invalid");
  });

  it("maps InvalidChangeRiskFilterError to 400", () => {
    const err = new InvalidChangeRiskFilterError("Critical");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid change risk filter: Critical");
  });

  it("maps ProblemForbiddenError to 403", () => {
    const err = new ProblemForbiddenError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("Forbidden");
  });

  it("maps ChangeForbiddenError to 403", () => {
    const err = new ChangeForbiddenError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("Forbidden");
  });

  it("maps InvalidChangeStatusTransitionError to 400", () => {
    const err = new InvalidChangeStatusTransitionError("Submitted", "Approved");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Invalid change status transition");
  });

  it("maps ChangeExecutionOutsideWindowError to 400", () => {
    const err = new ChangeExecutionOutsideWindowError();
    expect(mapApplicationErrorToHttp(err).statusCode).toBe(400);
  });

  it("maps ChangeExecutionWindowRequiredError to 400", () => {
    const err = new ChangeExecutionWindowRequiredError();
    expect(mapApplicationErrorToHttp(err).statusCode).toBe(400);
  });

  it("maps ChangeContentLockedError to 400", () => {
    const err = new ChangeContentLockedError();
    expect(mapApplicationErrorToHttp(err).statusCode).toBe(400);
  });

  it("maps ChangeSchedulingLockedError to 400", () => {
    const err = new ChangeSchedulingLockedError();
    expect(mapApplicationErrorToHttp(err).statusCode).toBe(400);
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
