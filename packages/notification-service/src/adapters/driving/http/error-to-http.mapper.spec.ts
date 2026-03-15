import { describe, it, expect } from "vitest";
import { mapApplicationErrorToHttp } from "./error-to-http.mapper";
import {
  NotificationNotFoundError,
  InvalidNotificationTypeError,
} from "../../../application/errors";

describe("mapApplicationErrorToHttp (notification-service)", () => {
  it("maps NotificationNotFoundError to 404", () => {
    const err = new NotificationNotFoundError("notif-123");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Notification not found: notif-123");
  });

  it("maps InvalidNotificationTypeError to 400", () => {
    const err = new InvalidNotificationTypeError("invalid");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Invalid notification type");
  });

  it("returns 500 and generic message for unmapped error", () => {
    const err = new Error("Database connection failed");
    const result = mapApplicationErrorToHttp(err);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Internal server error");
  });
});
