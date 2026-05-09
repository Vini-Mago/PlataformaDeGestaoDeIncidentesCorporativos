import { z } from "zod";
import {
  VALID_CHANGE_STATUSES,
  VALID_CHANGE_TYPES,
  VALID_CHANGE_RISKS,
} from "../../domain/entities/change.entity";

export const updateChangeSchema = z
  .object({
    status: z.enum(VALID_CHANGE_STATUSES as [string, ...string[]]).optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    justification: z.string().min(1).optional(),
    changeType: z.enum(VALID_CHANGE_TYPES as [string, ...string[]]).optional(),
    risk: z.enum(VALID_CHANGE_RISKS as [string, ...string[]]).optional(),
    windowStart: z.string().datetime().nullable().optional(),
    windowEnd: z.string().datetime().nullable().optional(),
    rollbackPlan: z.string().max(4096).nullable().optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.title !== undefined ||
      d.description !== undefined ||
      d.justification !== undefined ||
      d.changeType !== undefined ||
      d.risk !== undefined ||
      d.windowStart !== undefined ||
      d.windowEnd !== undefined ||
      d.rollbackPlan !== undefined,
    { message: "At least one field is required" }
  );

export type UpdateChangeDto = z.infer<typeof updateChangeSchema>;
