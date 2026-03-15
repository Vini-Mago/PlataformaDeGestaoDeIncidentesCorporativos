import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetNotificationUseCase } from "./get-notification.use-case";
import { NotificationNotFoundError } from "../errors";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { Notification } from "../../domain/entities/notification.entity";

describe("GetNotificationUseCase", () => {
  let notificationRepository: INotificationRepository;
  const notificationId = "11111111-1111-1111-1111-111111111111";
  const mockNotification: Notification = {
    id: notificationId,
    type: "email",
    recipient: "user@example.com",
    subject: "Subject",
    body: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    notificationRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockNotification),
      list: vi.fn(),
    };
  });

  it("returns notification when it exists", async () => {
    const useCase = new GetNotificationUseCase(notificationRepository);
    const result = await useCase.execute(notificationId);
    expect(result).toEqual(mockNotification);
    expect(notificationRepository.findById).toHaveBeenCalledWith(notificationId);
  });

  it("throws NotificationNotFoundError when notification does not exist", async () => {
    vi.mocked(notificationRepository.findById).mockResolvedValue(null);
    const useCase = new GetNotificationUseCase(notificationRepository);
    const missingId = "00000000-0000-0000-0000-000000000000";

    await expect(useCase.execute(missingId)).rejects.toThrow(NotificationNotFoundError);
    await expect(useCase.execute(missingId)).rejects.toThrow(`Notification not found: ${missingId}`);
  });
});
