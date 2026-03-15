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
  const s = String(value).toLowerCase();
  if (VALID_NOTIFICATION_TYPES.includes(s as "email" | "in_app" | "push")) {
    return s as "email" | "in_app" | "push";
  }
  throw new InvalidNotificationTypeError(s);
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(filters: {
    type?: "email" | "in_app" | "push";
    recipient?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit =
      typeof filters.limit === "number" && filters.limit > 0
        ? Math.min(filters.limit, MAX_LIMIT)
        : DEFAULT_LIMIT;
    const offset =
      typeof filters.offset === "number" && filters.offset >= 0
        ? filters.offset
        : 0;

    const listFilters: NotificationListFilters = {
      ...(filters.type && { type: filters.type }),
      ...(filters.recipient && { recipient: filters.recipient }),
      limit,
      offset,
    };
    return this.notificationRepository.list(listFilters);
  }
}
