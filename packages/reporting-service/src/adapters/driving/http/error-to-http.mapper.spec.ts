import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  ReportDefinitionNotFoundError,
  InvalidReportTypeError,
  ReportExportJobForbiddenError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (reporting-service)", () => {
  it("maps ReportDefinitionNotFoundError to 404", () => {
    const err = new ReportDefinitionNotFoundError("report-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Report definition not found: report-123");
  });

  it("maps InvalidReportTypeError to 400", () => {
    const err = new InvalidReportTypeError("invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid report type: invalid");
  });

  it("maps ReportExportJobForbiddenError to 403", () => {
    const err = new ReportExportJobForbiddenError();
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("Forbidden");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
