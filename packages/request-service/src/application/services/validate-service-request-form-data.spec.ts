import { describe, it, expect } from "vitest";
import { validateServiceRequestFormData } from "./validate-service-request-form-data";
import { FormDataValidationError, InvalidCatalogFormSchemaError } from "../errors";

describe("validateServiceRequestFormData", () => {
  it("skips when formSchema is null", () => {
    expect(() => validateServiceRequestFormData({ a: 1 }, null)).not.toThrow();
  });

  it("skips when formSchema is empty object", () => {
    expect(() => validateServiceRequestFormData({ a: 1 }, {})).not.toThrow();
  });

  it("accepts data matching a simple schema", () => {
    const schema = {
      type: "object",
      required: ["reason"],
      properties: { reason: { type: "string", minLength: 1 } },
    };
    expect(() => validateServiceRequestFormData({ reason: "ok" }, schema)).not.toThrow();
  });

  it("throws FormDataValidationError when required field missing", () => {
    const schema = {
      type: "object",
      required: ["reason"],
      properties: { reason: { type: "string" } },
    };
    expect(() => validateServiceRequestFormData({}, schema)).toThrow(FormDataValidationError);
  });

  it("throws InvalidCatalogFormSchemaError when schema is malformed for AJV", () => {
    const badSchema = { type: 123 };
    expect(() => validateServiceRequestFormData({}, badSchema as unknown as Record<string, unknown>)).toThrow(
      InvalidCatalogFormSchemaError
    );
  });
});
