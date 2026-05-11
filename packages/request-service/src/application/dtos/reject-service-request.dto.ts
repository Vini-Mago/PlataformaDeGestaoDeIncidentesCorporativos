import { z } from "zod";

export const rejectServiceRequestSchema = z.object({
  reason: z.string().trim().max(4000).optional(),
});

export type RejectServiceRequestDto = z.infer<typeof rejectServiceRequestSchema>;
