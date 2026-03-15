/**
 * Notification entity — type, recipient, subject, body; delivery tracking (status, sentAt, etc.).
 * Domain-only; no framework imports.
 */
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed";

export interface Notification {
  id: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  body: string | null;
  status: NotificationStatus;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export type NotificationType = "email" | "in_app" | "push";

export const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "email",
  "in_app",
  "push",
];
