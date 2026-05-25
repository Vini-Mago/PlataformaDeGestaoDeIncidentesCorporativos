import { z } from "zod";
import { SLA_BREACH_EVENT, SLA_RISK_EVENT } from "../rabbitmq.constants";

export const slaDomainEventTypeSchema = z.enum([SLA_RISK_EVENT, SLA_BREACH_EVENT]);

export const slaRiskPayloadSchema = z
  .object({
    ticketId: z.string().uuid(),
    ticketType: z.enum(["incident", "request"]),
    percentUsed: z.number(),
    deadlineType: z.string().min(1),
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const slaBreachPayloadSchema = z
  .object({
    ticketId: z.string().uuid(),
    ticketType: z.enum(["incident", "request"]),
    breachType: z.string().min(1),
    occurredAt: z.string().datetime(),
    percentUsed: z.number().optional(),
  })
  .passthrough();

export const slaDomainEventEnvelopeSchema = z
  .object({
    type: slaDomainEventTypeSchema,
    payload: z.record(z.unknown()),
  })
  .superRefine((value, ctx) => {
    const schema = value.type === SLA_RISK_EVENT ? slaRiskPayloadSchema : slaBreachPayloadSchema;
    const parsed = schema.safeParse(value.payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ["payload", ...(issue.path ?? [])],
        });
      }
    }
  });
