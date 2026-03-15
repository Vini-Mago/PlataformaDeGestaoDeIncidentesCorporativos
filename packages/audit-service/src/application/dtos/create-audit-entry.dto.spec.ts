import { describe, it, expect } from "vitest";
import { createAuditEntrySchema } from "./create-audit-entry.dto";

describe("createAuditEntrySchema", () => {
  it("accepts valid payload with required fields only", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.created",
      resourceType: "incident",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid payload with resourceId and metadata", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.updated",
      resourceType: "incident",
      resourceId: "22222222-2222-2222-2222-222222222222",
      metadata: { field: "status" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = createAuditEntrySchema.safeParse({
      action: "incident.created",
      resourceType: "incident",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid userId (not UUID)", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "not-a-uuid",
      action: "incident.created",
      resourceType: "incident",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing action", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "11111111-1111-1111-1111-111111111111",
      resourceType: "incident",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing resourceType", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.created",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid resourceId when provided (not UUID)", () => {
    const result = createAuditEntrySchema.safeParse({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "incident.created",
      resourceType: "incident",
      resourceId: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
