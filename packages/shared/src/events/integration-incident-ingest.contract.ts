import { z } from "zod";
import { INTEGRATION_INCIDENT_INGEST_EVENT } from "../rabbitmq.constants";

export const integrationIncidentIngestPayloadSchema = z
  .object({
    externalId: z.string().min(1),
    externalSource: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    criticality: z.string().min(1),
    requesterId: z.string().uuid(),
    serviceAffected: z.string().nullable().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .passthrough();

export const integrationIncidentIngestEnvelopeSchema = z.object({
  type: z.literal(INTEGRATION_INCIDENT_INGEST_EVENT),
  payload: integrationIncidentIngestPayloadSchema,
});
