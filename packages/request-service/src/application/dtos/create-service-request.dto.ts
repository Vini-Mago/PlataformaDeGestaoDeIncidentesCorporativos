import { z } from "zod";

export const createServiceRequestSchema = z.object({
  catalogItemId: z.string().uuid(),
  formData: z.record(z.unknown()).optional().nullable(),
});

export type CreateServiceRequestDto = z.infer<typeof createServiceRequestSchema>;
