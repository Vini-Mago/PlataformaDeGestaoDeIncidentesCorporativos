import type { Notification } from "../../domain/entities/notification.entity";

export interface CreateNotificationInput {
  type: string;
  recipient: string;
  subject: string;
  body?: string | null;
}

export interface NotificationListFilters {
  type?: "email" | "in_app" | "push";
  recipient?: string;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  list(filters?: NotificationListFilters): Promise<Notification[]>;
}
