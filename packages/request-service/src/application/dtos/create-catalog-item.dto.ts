import { z } from "zod";

export const createCatalogItemSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    responsibleTeamId: z.string().uuid().optional().nullable(),
    defaultSlaHours: z.number().int().positive().optional().nullable(),
    formSchema: z.record(z.unknown()).optional().nullable(),
    approvalFlow: z.enum(["none", "single", "sequential", "parallel"]).optional().default("none"),
    approverRoleIds: z.array(z.string().min(1)).optional().default([]),
  })
  .refine(
    (data) =>
      data.approvalFlow === "none" || (data.approverRoleIds?.length ?? 0) > 0,
    { message: "approverRoleIds must not be empty when approvalFlow is single, sequential, or parallel", path: ["approverRoleIds"] }
  );

export type CreateCatalogItemDto = z.infer<typeof createCatalogItemSchema>;
