import { z } from "zod";

export const userResponseDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  login: z.string().optional(),
  name: z.string(),
  status: z.enum(["active", "inactive"]).optional(),
  role: z.string().optional(),
  phone: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  preferredLanguage: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type UserResponseDto = z.infer<typeof userResponseDtoSchema>;
