import type { NotificationType } from "../../domain/entities/notification.entity";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { CreateNotificationDto } from "../dtos/create-notification.dto";
import type { IEmailSender } from "../ports/email-sender.port";
import { logger } from "@pgic/shared";

export class CreateNotificationUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly emailSender: IEmailSender
  ) {}

  async execute(dto: CreateNotificationDto, _createdByUserId?: string) {
    const notification = await this.notificationRepository.create({
      type: dto.type as NotificationType,
      recipient: dto.recipient,
      subject: dto.subject,
      body: dto.body ?? null,
    });

    if (notification.type !== "email") {
      return notification;
    }

    try {
      await this.emailSender.send({
        to: notification.recipient,
        subject: notification.subject,
        body: dto.deliveryBody ?? notification.body ?? notification.subject,
      });
      return await this.notificationRepository.markAsSent(notification.id);
    } catch (err) {
      logger.error({ err, notificationId: notification.id }, "Email delivery failed");
      await this.notificationRepository.markAsFailed(
        notification.id,
        err instanceof Error ? err.message : "Email delivery failed"
      );
      return await this.notificationRepository.findById(notification.id) ?? notification;
    }
  }
}
