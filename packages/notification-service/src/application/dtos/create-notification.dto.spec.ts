import { describe, it, expect } from "vitest";
import { createNotificationSchema } from "./create-notification.dto";

describe("createNotificationSchema", () => {
  it("accepts valid payload", () => {
    const result = createNotificationSchema.safeParse({
      type: "email",
      recipient: "user@example.com",
      subject: "Test subject",
    });
    expect(result.success).toBe(true);
  });

  it("accepts payload with body", () => {
    const result = createNotificationSchema.safeParse({
      type: "in_app",
      recipient: "user-id",
      subject: "Alert",
      body: "Message body",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const result = createNotificationSchema.safeParse({
      recipient: "user@example.com",
      subject: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createNotificationSchema.safeParse({
      type: "sms",
      recipient: "user@example.com",
      subject: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing recipient", () => {
    const result = createNotificationSchema.safeParse({
      type: "email",
      subject: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing subject", () => {
    const result = createNotificationSchema.safeParse({
      type: "email",
      recipient: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});
