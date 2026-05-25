import { z } from "zod";

export const outboundHttpMethodSchema = z.enum(["POST", "PUT", "PATCH", "DELETE"]);

export const createOutboundDeliveryBodySchema = z.object({
  endpoint: z.string().url(),
  method: outboundHttpMethodSchema.default("POST"),
  headers: z.record(z.string()).optional(),
  payload: z.record(z.unknown()).optional(),
  externalId: z.string().min(1).max(120).optional(),
  timeoutMs: z.coerce.number().int().min(500).max(30_000).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(5).optional(),
});

export type CreateOutboundDeliveryBody = z.infer<typeof createOutboundDeliveryBodySchema>;
