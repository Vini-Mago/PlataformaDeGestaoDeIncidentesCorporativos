import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateNotificationUseCase } from "./create-notification.use-case";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { Notification } from "../../domain/entities/notification.entity";
import type { IEmailSender } from "../ports/email-sender.port";

describe("CreateNotificationUseCase", () => {
  let notificationRepository: INotificationRepository;
  let emailSender: IEmailSender;
  const mockNotification: Notification = {
    id: "22222222-2222-2222-2222-222222222222",
    type: "email",
    recipient: "user@example.com",
    subject: "Test",
    body: "Body text",
    status: "pending",
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    errorMessage: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    notificationRepository = {
      create: vi.fn().mockResolvedValue(mockNotification),
      markAsSent: vi.fn().mockResolvedValue({ ...mockNotification, status: "sent", sentAt: new Date(), deliveredAt: new Date() }),
      markAsFailed: vi.fn().mockResolvedValue({ ...mockNotification, status: "failed", failedAt: new Date(), errorMessage: "failed" }),
      findById: vi.fn(),
      list: vi.fn(),
    };
    emailSender = {
      send: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("creates notification with required fields", async () => {
    const useCase = new CreateNotificationUseCase(notificationRepository, emailSender);
    const dto = {
      type: "email" as const,
      recipient: "user@example.com",
      subject: "Test",
    };

    const result = await useCase.execute(dto);

    expect(result.status).toBe("sent");
    expect(notificationRepository.create).toHaveBeenCalledWith({
      type: dto.type,
      recipient: dto.recipient,
      subject: dto.subject,
      body: null,
    });
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it("creates notification with optional body", async () => {
    vi.mocked(notificationRepository.create).mockResolvedValue({
      ...mockNotification,
      type: "in_app",
      recipient: "user-id-123",
      subject: "Alert",
      body: "Message body",
    });
    const useCase = new CreateNotificationUseCase(notificationRepository, emailSender);
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
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("persists redacted body but sends deliveryBody when provided", async () => {
    vi.mocked(notificationRepository.create).mockResolvedValue({
      ...mockNotification,
      subject: "Password recovery",
      body: "Sensitive reset token omitted.",
    });
    const useCase = new CreateNotificationUseCase(notificationRepository, emailSender);

    await useCase.execute({
      type: "email",
      recipient: "user@example.com",
      subject: "Password recovery",
      body: "Sensitive reset token omitted.",
      deliveryBody: "Use token raw-reset-token",
    });

    expect(notificationRepository.create).toHaveBeenCalledWith({
      type: "email",
      recipient: "user@example.com",
      subject: "Password recovery",
      body: "Sensitive reset token omitted.",
    });
    expect(emailSender.send).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Password recovery",
      body: "Use token raw-reset-token",
    });
  });

  it("marks email as failed when sender throws", async () => {
    emailSender.send = vi.fn().mockRejectedValue(new Error("smtp down"));
    notificationRepository.findById = vi.fn().mockResolvedValue({
      ...mockNotification,
      status: "failed",
      failedAt: new Date(),
      errorMessage: "smtp down",
    });
    const useCase = new CreateNotificationUseCase(notificationRepository, emailSender);

    const result = await useCase.execute({
      type: "email",
      recipient: "user@example.com",
      subject: "Test",
      body: "Body text",
    });

    expect(notificationRepository.markAsFailed).toHaveBeenCalled();
    expect(result.status).toBe("failed");
  });
});
