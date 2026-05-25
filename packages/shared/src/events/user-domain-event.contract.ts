import { z } from "zod";
import { USER_CREATED_EVENT } from "./user-created.event";
import { USER_UPDATED_EVENT } from "./user-updated.event";
import { nameSchema } from "../schemas/name.schema";

const emailSchema = z
  .string()
  .min(1)
  .max(254)
  .refine((s) => !/<|>/.test(s), "email must not contain < or >");

export const userDomainEventTypeSchema = z.enum([USER_CREATED_EVENT, USER_UPDATED_EVENT]);

export const userDomainEventPayloadSchema = z
  .object({
    userId: z.string().uuid(),
    email: emailSchema,
    name: nameSchema,
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const userDomainEventEnvelopeSchema = z.object({
  type: userDomainEventTypeSchema,
  payload: userDomainEventPayloadSchema,
});
