import { z } from "zod";

const severityToCriticality: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Low",
};

export const monitoringWebhookBodySchema = z.object({
  externalId: z.string().min(1).max(256),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  criticality: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  severity: z.string().max(64).optional(),
  serviceAffected: z.string().max(256).optional(),
  source: z.string().max(128).optional(),
});

export type MonitoringWebhookBody = z.infer<typeof monitoringWebhookBodySchema>;

export function mapSeverityToCriticality(
  severity: string | undefined,
  explicit?: string
): "Low" | "Medium" | "High" | "Critical" {
  if (explicit && ["Low", "Medium", "High", "Critical"].includes(explicit)) {
    return explicit as "Low" | "Medium" | "High" | "Critical";
  }
  const key = (severity ?? "medium").toLowerCase();
  const mapped = severityToCriticality[key];
  if (mapped && ["Low", "Medium", "High", "Critical"].includes(mapped)) {
    return mapped as "Low" | "Medium" | "High" | "Critical";
  }
  return "Medium";
}
