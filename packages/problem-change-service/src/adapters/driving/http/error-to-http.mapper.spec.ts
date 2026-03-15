import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  ProblemNotFoundError,
  ChangeNotFoundError,
  InvalidProblemStatusFilterError,
  InvalidChangeStatusFilterError,
  InvalidChangeRiskFilterError,
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

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
