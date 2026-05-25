import { describe, expect, it } from "vitest";
import { maskSensitivePayload } from "./mask-sensitive-payload";

describe("maskSensitivePayload", () => {
  it("masks known sensitive keys recursively", () => {
    const masked = maskSensitivePayload({
      token: "abc",
      nested: {
        apiKey: "123",
        Authorization: "Bearer x",
      },
      list: [{ password: "p1" }, { ok: "value" }],
    });

    expect(masked).toEqual({
      token: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        Authorization: "[redacted]",
      },
      list: [{ password: "[redacted]" }, { ok: "value" }],
    });
  });
});
