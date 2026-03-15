import { describe, it, expect } from "vitest";
import { createSlaPolicySchema } from "./create-sla-policy.dto";

describe("createSlaPolicySchema", () => {
  const validPayload = {
    name: "Incident Critical",
    ticketType: "incident",
    responseMinutes: 15,
    resolutionMinutes: 240,
    calendarId: "11111111-1111-1111-1111-111111111111",
  };

  it("accepts valid payload", () => {
    const result = createSlaPolicySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts request ticketType", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      ticketType: "request",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional criticality, serviceId, clientId, priority, isActive", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      criticality: "High",
      serviceId: "22222222-2222-2222-2222-222222222222",
      clientId: null,
      priority: 5,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ticketType", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      ticketType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive responseMinutes", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      responseMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid calendarId (not UUID)", () => {
    const result = createSlaPolicySchema.safeParse({
      ...validPayload,
      calendarId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
