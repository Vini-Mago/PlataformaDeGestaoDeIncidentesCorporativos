import { describe, it, expect } from "vitest";
import { createChangeSchema } from "./create-change.dto";

describe("createChangeSchema", () => {
  it("accepts valid payload", () => {
    const result = createChangeSchema.safeParse({
      title: "Deploy v2",
      description: "New feature release",
      justification: "Business requirement",
      changeType: "Normal",
      risk: "Medium",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional window and rollbackPlan", () => {
    const result = createChangeSchema.safeParse({
      title: "Emergency fix",
      description: "Critical patch",
      justification: "Security",
      changeType: "Emergency",
      risk: "High",
      windowStart: "2025-03-15T10:00:00.000Z",
      windowEnd: "2025-03-15T12:00:00.000Z",
      rollbackPlan: "Revert commit",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid changeType", () => {
    const result = createChangeSchema.safeParse({
      title: "Title",
      description: "Desc",
      justification: "J",
      changeType: "Invalid",
      risk: "Low",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid risk", () => {
    const result = createChangeSchema.safeParse({
      title: "Title",
      description: "Desc",
      justification: "J",
      changeType: "Standard",
      risk: "Critical",
    });
    expect(result.success).toBe(false);
  });
});
