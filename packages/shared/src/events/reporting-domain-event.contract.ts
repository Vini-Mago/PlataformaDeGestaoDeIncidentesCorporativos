import { z } from "zod";
import { REPORTING_EXPORTED_EVENT } from "../rabbitmq.constants";

export const reportingExportedPayloadSchema = z
  .object({
    jobId: z.string().uuid(),
    reportType: z.string().nullable(),
    requestedById: z.string().uuid(),
    fileUrl: z.string().url().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .passthrough();

export const reportingExportedEnvelopeSchema = z.object({
  type: z.literal(REPORTING_EXPORTED_EVENT),
  payload: reportingExportedPayloadSchema,
});
