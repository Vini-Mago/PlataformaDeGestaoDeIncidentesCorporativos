import { describe, it, expect } from "vitest";
import { addBusinessMinutes } from "./business-time";

describe("addBusinessMinutes", () => {
  const calendar = {
    workingDays: [1, 2, 3, 4, 5],
    workStartMinutes: 8 * 60,
    workEndMinutes: 18 * 60,
  };

  it("adiciona minutos dentro do horário comercial", () => {
    const start = new Date("2025-05-20T10:00:00.000Z");
    const result = addBusinessMinutes(start, 30, calendar, new Set());
    expect(result.getTime()).toBeGreaterThan(start.getTime());
  });
});
