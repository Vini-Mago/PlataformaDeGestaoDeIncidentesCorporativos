import { z } from "zod";

export const createAuditEntrySchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  action: z.string().min(1, "Action is required"),
  resourceType: z.string().min(1, "Resource type is required"),
  resourceId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type CreateAuditEntryDto = z.infer<typeof createAuditEntrySchema>;
