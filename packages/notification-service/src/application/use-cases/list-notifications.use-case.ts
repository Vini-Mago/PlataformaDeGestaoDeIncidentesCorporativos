import type {
  INotificationRepository,
  NotificationListFilters,
} from "../ports/notification-repository.port";
import { InvalidNotificationTypeError } from "../errors";
import { VALID_NOTIFICATION_TYPES } from "../../domain/entities/notification.entity";

export function parseTypeFilter(value: unknown): "email" | "in_app" | "push" | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).toLowerCase();
  if (VALID_NOTIFICATION_TYPES.includes(s as "email" | "in_app" | "push")) {
    return s as "email" | "in_app" | "push";
  }
  return undefined;
}

export function parseTypeFilterOrThrow(value: unknown): "email" | "in_app" | "push" | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value);
  if (VALID_NOTIFICATION_TYPES.includes(s as "email" | "in_app" | "push")) {
    return s as "email" | "in_app" | "push";
  }
  throw new InvalidNotificationTypeError(s);
}

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(filters: { type?: "email" | "in_app" | "push"; recipient?: string }) {
    const listFilters: NotificationListFilters = {
      ...(filters.type && { type: filters.type }),
      ...(filters.recipient && { recipient: filters.recipient }),
    };
    return this.notificationRepository.list(listFilters);
  }
}
