import { z } from "zod";

export const problemIncidentLinkPayloadSchema = z.object({
  problemId: z.string().uuid(),
  incidentId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

export type ProblemIncidentLinkPayload = z.infer<typeof problemIncidentLinkPayloadSchema>;
