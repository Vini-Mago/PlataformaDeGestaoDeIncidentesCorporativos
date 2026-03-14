import { z } from "zod";
import { nameSchema } from "@pgic/shared";

/**
 * Validates user.created event payload from RabbitMQ.
 * Consumers must not trust the broker; validate before persisting.
 */
const emailSchema = z
  .string()
  .min(1, "email is required")
  .max(254, "email too long")
  .refine((s) => !/<|>/.test(s), "email must not contain < or >");

const isoDateSchema = z
  .string()
  .datetime({ message: "occurredAt must be a valid ISO 8601 datetime" });

export const userCreatedPayloadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: emailSchema,
  name: nameSchema,
  occurredAt: isoDateSchema,
});

export type UserCreatedPayloadDto = z.infer<typeof userCreatedPayloadSchema>;
