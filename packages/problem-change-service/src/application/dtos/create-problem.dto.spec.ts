import { describe, it, expect } from "vitest";
import { createProblemSchema } from "./create-problem.dto";

describe("createProblemSchema", () => {
  it("accepts valid payload", () => {
    const result = createProblemSchema.safeParse({
      title: "Recurring outage",
      description: "Server goes down every Friday",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional rootCause and actionPlan", () => {
    const result = createProblemSchema.safeParse({
      title: "Bug",
      description: "UI glitch",
      rootCause: "Memory leak",
      actionPlan: "Patch release",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createProblemSchema.safeParse({
      title: "",
      description: "Desc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = createProblemSchema.safeParse({
      title: "Title",
    });
    expect(result.success).toBe(false);
  });
});
