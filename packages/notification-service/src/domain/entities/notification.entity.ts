/**
 * Notification entity — type, recipient, subject, body.
 * Domain-only; no framework imports.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  body: string | null;
  createdAt: Date;
}

export type NotificationType = "email" | "in_app" | "push";

export const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "email",
  "in_app",
  "push",
];
