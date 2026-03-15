import { z } from "zod";

export const assignIncidentSchema = z.object({
  assignedTeamId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export type AssignIncidentDto = z.infer<typeof assignIncidentSchema>;
