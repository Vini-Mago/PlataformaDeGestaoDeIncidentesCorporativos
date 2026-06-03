import { z } from "zod";
import { NOTIFICATION_EMAIL_SENT_EVENT } from "../rabbitmq.constants";

export const notificationEmailSentPayloadSchema = z
  .object({
    notificationId: z.string().uuid(),
    recipient: z.string().email(),
    subject: z.string(),
    occurredAt: z.string().datetime().optional(),
  })
  .passthrough();

export const notificationEmailSentEnvelopeSchema = z.object({
  type: z.literal(NOTIFICATION_EMAIL_SENT_EVENT),
  payload: notificationEmailSentPayloadSchema,
});
