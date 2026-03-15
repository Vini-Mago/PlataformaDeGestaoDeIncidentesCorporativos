import { z } from "zod";
import { VALID_NOTIFICATION_TYPES } from "../../domain/entities/notification.entity";

export const createNotificationSchema = z.object({
  type: z.enum(VALID_NOTIFICATION_TYPES as unknown as [string, ...string[]]),
  recipient: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().nullable().optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
