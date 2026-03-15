import { z } from "zod";

export const createCalendarSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    timezone: z.string().default("UTC"),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1, "At least one working day required"),
    workStartMinutes: z.number().int().min(0).max(1439),
    workEndMinutes: z.number().int().min(0).max(1439),
  })
  .refine((data) => data.workEndMinutes > data.workStartMinutes, {
    message: "workEndMinutes must be after workStartMinutes",
    path: ["workEndMinutes"],
  });

export type CreateCalendarDto = z.infer<typeof createCalendarSchema>;
