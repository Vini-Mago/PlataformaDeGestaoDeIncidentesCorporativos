import type { Notification, NotificationType } from "../../domain/entities/notification.entity";

export type { NotificationType };

export interface CreateNotificationInput {
  type: NotificationType;
  recipient: string;
  subject: string;
  body?: string | null;
}

export interface NotificationListFilters {
  type?: NotificationType;
  recipient?: string;
  limit?: number;
  offset?: number;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  list(filters?: NotificationListFilters): Promise<Notification[]>;
}
