import { z } from "zod";

const problemStatusZod = z.enum(["Open", "InAnalysis", "Resolved", "Closed"]);

export const updateProblemSchema = z
  .object({
    status: problemStatusZod.optional(),
    rootCause: z.string().max(65535).nullable().optional(),
    actionPlan: z.string().max(65535).nullable().optional(),
  })
  .refine((d) => d.status !== undefined || d.rootCause !== undefined || d.actionPlan !== undefined, {
    message: "At least one of status, rootCause, actionPlan is required",
  });

export type UpdateProblemDto = z.infer<typeof updateProblemSchema>;
