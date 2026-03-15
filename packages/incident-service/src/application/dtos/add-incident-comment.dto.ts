import { z } from "zod";

export const addIncidentCommentSchema = z.object({
  body: z.string().min(1, "body is required").max(10000),
});

export type AddIncidentCommentDto = z.infer<typeof addIncidentCommentSchema>;
