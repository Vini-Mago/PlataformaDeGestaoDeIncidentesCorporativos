import { z } from "zod";
import { REQUEST_DOMAIN_EVENT_NAMES } from "../rabbitmq.constants";

export const requestDomainEventTypeSchema = z.enum(REQUEST_DOMAIN_EVENT_NAMES);

export const requestDomainEventPayloadSchema = z
  .object({
    serviceRequestId: z.string().uuid(),
    requesterId: z.string().uuid(),
    requesterEmail: z.string().email().optional(),
    occurredAt: z.string().datetime(),
    catalogItemId: z.string().uuid().optional(),
    status: z.string().optional(),
    actorId: z.string().uuid().optional(),
    fromStatus: z.string().optional(),
    toStatus: z.string().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

export const requestDomainEventEnvelopeSchema = z.object({
  type: requestDomainEventTypeSchema,
  payload: requestDomainEventPayloadSchema,
});

export type RequestDomainEventType = z.infer<typeof requestDomainEventTypeSchema>;
export type RequestDomainEventPayload = z.infer<typeof requestDomainEventPayloadSchema>;
export type RequestDomainEventEnvelope = z.infer<typeof requestDomainEventEnvelopeSchema>;
