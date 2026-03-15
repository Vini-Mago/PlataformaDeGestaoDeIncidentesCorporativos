import { z } from "zod";

export const createProblemSchema = z.object({
  title: z.string().min(1, "title is required").max(255),
  description: z.string().min(1, "description is required"),
  rootCause: z.string().max(4096).nullable().optional(),
  actionPlan: z.string().max(4096).nullable().optional(),
});

export type CreateProblemDto = z.infer<typeof createProblemSchema>;
