import { z } from "zod";

export const linkIncidentToProblemSchema = z.object({
  incidentId: z.string().uuid(),
});

export type LinkIncidentToProblemDto = z.infer<typeof linkIncidentToProblemSchema>;
