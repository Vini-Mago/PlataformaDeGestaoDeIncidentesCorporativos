import { z } from "zod";
import { VALID_CHANGE_TYPES, VALID_CHANGE_RISKS } from "../../domain/entities/change.entity";

export const createChangeSchema = z.object({
  title: z.string().min(1, "title is required").max(255),
  description: z.string().min(1, "description is required"),
  justification: z.string().min(1, "justification is required"),
  changeType: z.enum(VALID_CHANGE_TYPES as [string, ...string[]]),
  risk: z.enum(VALID_CHANGE_RISKS as [string, ...string[]]),
  windowStart: z.string().datetime().nullable().optional(),
  windowEnd: z.string().datetime().nullable().optional(),
  rollbackPlan: z.string().max(4096).nullable().optional(),
});

export type CreateChangeDto = z.infer<typeof createChangeSchema>;
