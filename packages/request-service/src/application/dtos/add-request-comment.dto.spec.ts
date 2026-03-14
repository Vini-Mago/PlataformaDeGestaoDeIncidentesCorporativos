import { describe, it, expect } from "vitest";
import { addRequestCommentSchema } from "./add-request-comment.dto";

describe("addRequestCommentSchema", () => {
  it("accepts valid body", () => {
    const dto = { body: "This is a valid comment" };
    const result = addRequestCommentSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("accepts minimal body (1 character)", () => {
    const dto = { body: "x" };
    const result = addRequestCommentSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const dto = { body: "" };
    const result = addRequestCommentSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });

  it("rejects body exceeding 4000 characters", () => {
    const dto = { body: "x".repeat(4001) };
    const result = addRequestCommentSchema.safeParse(dto);
    expect(result.success).toBe(false);
  });
});
