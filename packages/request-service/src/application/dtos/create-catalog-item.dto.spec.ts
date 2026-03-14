import { describe, it, expect } from "vitest";
import { createCatalogItemSchema } from "./create-catalog-item.dto";

describe("createCatalogItemSchema", () => {
  it("accepts valid dto with name only", () => {
    const dto = { name: "Access Request" };
    const result = createCatalogItemSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("accepts full dto", () => {
    const dto = {
      name: "Access Request",
      description: "Request system access",
      category: "IT",
      responsibleTeamId: "11111111-1111-1111-1111-111111111111",
      defaultSlaHours: 24,
      approvalFlow: "single" as const,
      approverRoleIds: ["manager"],
    };
    const result = createCatalogItemSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const dto = { name: "" };
    const result = createCatalogItemSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });

  it("rejects approvalFlow single with empty approverRoleIds", () => {
    const dto = {
      name: "Item",
      approvalFlow: "single" as const,
      approverRoleIds: [],
    };
    const result = createCatalogItemSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });

  it("accepts approvalFlow none with empty approverRoleIds", () => {
    const dto = {
      name: "Item",
      approvalFlow: "none" as const,
      approverRoleIds: [],
    };
    const result = createCatalogItemSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });
});
