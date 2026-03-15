import type { NotificationType } from "../../domain/entities/notification.entity";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { CreateNotificationDto } from "../dtos/create-notification.dto";

export class CreateNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(dto: CreateNotificationDto, _createdByUserId?: string) {
    return this.notificationRepository.create({
      type: dto.type as NotificationType,
      recipient: dto.recipient,
      subject: dto.subject,
      body: dto.body ?? null,
    });
  }
}
