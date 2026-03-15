import { z } from "zod";
import { VALID_REPORT_TYPES } from "../../domain/entities/report-definition.entity";

export const createReportDefinitionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  reportType: z.enum(VALID_REPORT_TYPES as unknown as [string, ...string[]]),
  filters: z.record(z.unknown()).default({}),
});

export type CreateReportDefinitionDto = z.infer<typeof createReportDefinitionSchema>;
