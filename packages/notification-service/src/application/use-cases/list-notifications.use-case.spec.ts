import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListNotificationsUseCase,
  parseTypeFilter,
  parseTypeFilterOrThrow,
} from "./list-notifications.use-case";
import { InvalidNotificationTypeError } from "../errors";
import type { INotificationRepository } from "../ports/notification-repository.port";

describe("ListNotificationsUseCase", () => {
  let notificationRepository: INotificationRepository;

  beforeEach(() => {
    notificationRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("lists notifications with no filters", async () => {
    const useCase = new ListNotificationsUseCase(notificationRepository);
    await useCase.execute({});
    expect(notificationRepository.list).toHaveBeenCalledWith({});
  });

  it("lists notifications with type and recipient filters", async () => {
    const useCase = new ListNotificationsUseCase(notificationRepository);
    await useCase.execute({ type: "email", recipient: "user@test.com" });
    expect(notificationRepository.list).toHaveBeenCalledWith({
      type: "email",
      recipient: "user@test.com",
    });
  });
});

describe("parseTypeFilter", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseTypeFilter(undefined)).toBeUndefined();
    expect(parseTypeFilter(null)).toBeUndefined();
  });

  it("returns type for valid strings", () => {
    expect(parseTypeFilter("email")).toBe("email");
    expect(parseTypeFilter("in_app")).toBe("in_app");
    expect(parseTypeFilter("push")).toBe("push");
    expect(parseTypeFilter("EMAIL")).toBe("email");
  });

  it("returns undefined for invalid value", () => {
    expect(parseTypeFilter("invalid")).toBeUndefined();
  });
});

describe("parseTypeFilterOrThrow", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseTypeFilterOrThrow(undefined)).toBeUndefined();
    expect(parseTypeFilterOrThrow(null)).toBeUndefined();
  });

  it("returns type for valid strings", () => {
    expect(parseTypeFilterOrThrow("email")).toBe("email");
    expect(parseTypeFilterOrThrow("in_app")).toBe("in_app");
    expect(parseTypeFilterOrThrow("push")).toBe("push");
  });

  it("throws InvalidNotificationTypeError for invalid value", () => {
    expect(() => parseTypeFilterOrThrow("invalid")).toThrow(InvalidNotificationTypeError);
    expect(() => parseTypeFilterOrThrow("invalid")).toThrow(/Invalid notification type/);
  });
});
