import { describe, it, expect } from "vitest";
import { createEscalationRuleSchema } from "./create-escalation-rule.dto";

describe("createEscalationRuleSchema", () => {
  it("accepts valid payload", () => {
    const result = createEscalationRuleSchema.safeParse({
      name: "No first response",
      ticketType: "incident",
      conditionType: "no_first_response_minutes",
      conditionValue: "15",
      actions: ["notify_manager", "alert"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(0);
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects missing name", () => {
    const result = createEscalationRuleSchema.safeParse({
      ticketType: "incident",
      conditionType: "no_first_response_minutes",
      conditionValue: "15",
      actions: ["notify_manager"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ticketType", () => {
    const result = createEscalationRuleSchema.safeParse({
      name: "Rule",
      ticketType: "invalid",
      conditionType: "no_first_response_minutes",
      conditionValue: "15",
      actions: ["notify_manager"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty actions", () => {
    const result = createEscalationRuleSchema.safeParse({
      name: "Rule",
      ticketType: "incident",
      conditionType: "no_first_response_minutes",
      conditionValue: "15",
      actions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action", () => {
    const result = createEscalationRuleSchema.safeParse({
      name: "Rule",
      ticketType: "incident",
      conditionType: "no_first_response_minutes",
      conditionValue: "15",
      actions: ["invalid_action"],
    });
    expect(result.success).toBe(false);
  });
});
