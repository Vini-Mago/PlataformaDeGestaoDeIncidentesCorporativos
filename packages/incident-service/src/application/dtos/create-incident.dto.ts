import { z } from "zod";
import { VALID_CRITICALITIES } from "../../domain/entities/incident.entity";

export const createIncidentSchema = z.object({
  title: z.string().min(1, "title is required").max(255),
  description: z.string().min(1, "description is required"),
  criticality: z.enum(VALID_CRITICALITIES as [string, ...string[]]),
  serviceAffected: z.string().max(255).nullable().optional(),
});

export type CreateIncidentDto = z.infer<typeof createIncidentSchema>;
