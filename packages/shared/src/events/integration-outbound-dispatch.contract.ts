import { z } from "zod";
import { INTEGRATION_OUTBOUND_DISPATCH_EVENT } from "../rabbitmq.constants";

export const integrationOutboundDispatchPayloadSchema = z
  .object({
    deliveryId: z.string().uuid(),
    endpoint: z.string().url(),
    method: z.string(),
    externalId: z.string().nullable().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .passthrough();

export const integrationOutboundDispatchEnvelopeSchema = z.object({
  type: z.literal(INTEGRATION_OUTBOUND_DISPATCH_EVENT),
  payload: integrationOutboundDispatchPayloadSchema,
});
