import { z } from "zod";

export const createSlaPolicySchema = z.object({
  name: z.string().min(1, "Name is required"),
  ticketType: z.enum(["incident", "request"]),
  criticality: z.enum(["Low", "Medium", "High", "Critical"]).nullable().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  responseMinutes: z.number().int().positive("Response minutes must be positive"),
  resolutionMinutes: z.number().int().positive("Resolution minutes must be positive"),
  calendarId: z.string().uuid("Invalid calendar ID"),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CreateSlaPolicyDto = z.infer<typeof createSlaPolicySchema>;
