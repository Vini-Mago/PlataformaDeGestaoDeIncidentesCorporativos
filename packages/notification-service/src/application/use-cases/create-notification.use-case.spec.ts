import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateNotificationUseCase } from "./create-notification.use-case";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { Notification } from "../../domain/entities/notification.entity";

describe("CreateNotificationUseCase", () => {
  let notificationRepository: INotificationRepository;
  const mockNotification: Notification = {
    id: "22222222-2222-2222-2222-222222222222",
    type: "email",
    recipient: "user@example.com",
    subject: "Test",
    body: "Body text",
    createdAt: new Date(),
  };

  beforeEach(() => {
    notificationRepository = {
      create: vi.fn().mockResolvedValue(mockNotification),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates notification with required fields", async () => {
    const useCase = new CreateNotificationUseCase(notificationRepository);
    const dto = {
      type: "email" as const,
      recipient: "user@example.com",
      subject: "Test",
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockNotification);
    expect(notificationRepository.create).toHaveBeenCalledWith({
      type: dto.type,
      recipient: dto.recipient,
      subject: dto.subject,
      body: null,
    });
  });

  it("creates notification with optional body", async () => {
    const useCase = new CreateNotificationUseCase(notificationRepository);
    const dto = {
      type: "in_app" as const,
      recipient: "user-id-123",
      subject: "Alert",
      body: "Message body",
    };

    await useCase.execute(dto);

    expect(notificationRepository.create).toHaveBeenCalledWith({
      type: dto.type,
      recipient: dto.recipient,
      subject: dto.subject,
      body: "Message body",
    });
  });
});
