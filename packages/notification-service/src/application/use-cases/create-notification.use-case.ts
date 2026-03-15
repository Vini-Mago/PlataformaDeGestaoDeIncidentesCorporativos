import type { INotificationRepository } from "../ports/notification-repository.port";
import type { CreateNotificationDto } from "../dtos/create-notification.dto";

export class CreateNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(dto: CreateNotificationDto) {
    return this.notificationRepository.create({
      type: dto.type,
      recipient: dto.recipient,
      subject: dto.subject,
      body: dto.body ?? null,
    });
  }
}
