import { AppError } from "@pgic/shared";

export class NotificationNotFoundError extends AppError {
  override name = "NotificationNotFoundError";
  constructor(id: string) {
    super(`Notification not found: ${id}`);
    Object.setPrototypeOf(this, NotificationNotFoundError.prototype);
  }
}

export class InvalidNotificationTypeError extends AppError {
  override name = "InvalidNotificationTypeError";
  constructor(value: string) {
    super(`Invalid notification type: ${value}. Expected email, in_app or push.`);
    Object.setPrototypeOf(this, InvalidNotificationTypeError.prototype);
  }
}
