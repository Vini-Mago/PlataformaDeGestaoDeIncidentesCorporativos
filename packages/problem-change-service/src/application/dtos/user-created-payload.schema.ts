import { z } from "zod";
import { nameSchema } from "@pgic/shared";

const isoDateSchema = z
  .string()
  .datetime({ message: "occurredAt must be a valid ISO 8601 datetime" });

export const userCreatedPayloadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: z.string().min(1).max(254).email("Invalid email format"),
  name: nameSchema,
  occurredAt: isoDateSchema,
});

export type UserCreatedPayloadDto = z.infer<typeof userCreatedPayloadSchema>;
