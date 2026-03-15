import type { INotificationRepository } from "../ports/notification-repository.port";
import { NotificationNotFoundError } from "../errors";

export class GetNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(id: string) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new NotificationNotFoundError(id);
    return notification;
  }
}
