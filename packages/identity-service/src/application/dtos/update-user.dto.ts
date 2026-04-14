import { z } from "zod";
import {
  emailSchema,
  nameSchema,
  loginSchema,
  optionalPhoneSchema,
  optionalDepartmentSchema,
  optionalJobTitleSchema,
  optionalPhotoUrlSchema,
  optionalLanguageSchema,
  optionalTimeZoneSchema,
  userStatusSchema,
} from "./auth-common.schema";

export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    login: loginSchema.optional(),
    name: nameSchema.optional(),
    role: z.string().trim().min(1).max(64).optional(),
    status: userStatusSchema.optional(),
    phone: optionalPhoneSchema,
    department: optionalDepartmentSchema,
    jobTitle: optionalJobTitleSchema,
    photoUrl: optionalPhotoUrlSchema,
    preferredLanguage: optionalLanguageSchema,
    timeZone: optionalTimeZoneSchema,
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
