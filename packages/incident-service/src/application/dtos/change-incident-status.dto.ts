import { z } from "zod";

export const changeIncidentStatusSchema = z.object({
  toStatus: z.string().min(1, "toStatus is required"),
  comment: z.string().max(2000).nullable().optional(),
});

export type ChangeIncidentStatusDto = z.infer<typeof changeIncidentStatusSchema>;
