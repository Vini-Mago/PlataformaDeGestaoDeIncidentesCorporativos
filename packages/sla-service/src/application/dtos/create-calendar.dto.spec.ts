import { describe, it, expect } from "vitest";
import { createCalendarSchema } from "./create-calendar.dto";

describe("createCalendarSchema", () => {
  it("accepts valid payload", () => {
    const result = createCalendarSchema.safeParse({
      name: "Business Hours",
      workingDays: [1, 2, 3, 4, 5],
      workStartMinutes: 480,
      workEndMinutes: 1080,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional timezone", () => {
    const result = createCalendarSchema.safeParse({
      name: "Local",
      timezone: "America/Sao_Paulo",
      workingDays: [1, 2, 3, 4, 5],
      workStartMinutes: 540,
      workEndMinutes: 1080,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCalendarSchema.safeParse({
      name: "",
      workingDays: [1, 2, 3],
      workStartMinutes: 480,
      workEndMinutes: 1080,
    });
    expect(result.success).toBe(false);
  });

  it("rejects workEndMinutes <= workStartMinutes", () => {
    const result = createCalendarSchema.safeParse({
      name: "Bad",
      workingDays: [1],
      workStartMinutes: 1080,
      workEndMinutes: 480,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty workingDays", () => {
    const result = createCalendarSchema.safeParse({
      name: "Cal",
      workingDays: [],
      workStartMinutes: 480,
      workEndMinutes: 1080,
    });
    expect(result.success).toBe(false);
  });
});
