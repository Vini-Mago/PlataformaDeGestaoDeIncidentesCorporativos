import { describe, it, expect } from "vitest";
import { createServiceRequestSchema } from "./create-service-request.dto";

describe("createServiceRequestSchema", () => {
  it("accepts valid dto with catalogItemId and formData", () => {
    const dto = {
      catalogItemId: "11111111-1111-1111-1111-111111111111",
      formData: { reason: "Access needed" },
    };
    const result = createServiceRequestSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("accepts valid dto with catalogItemId only (formData optional)", () => {
    const dto = { catalogItemId: "11111111-1111-1111-1111-111111111111" };
    const result = createServiceRequestSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("accepts null formData", () => {
    const dto = {
      catalogItemId: "11111111-1111-1111-1111-111111111111",
      formData: null,
    };
    const result = createServiceRequestSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("rejects invalid catalogItemId (not UUID)", () => {
    const dto = { catalogItemId: "not-a-uuid" };
    const result = createServiceRequestSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });

  it("rejects missing catalogItemId", () => {
    const dto = {};
    const result = createServiceRequestSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });
});
