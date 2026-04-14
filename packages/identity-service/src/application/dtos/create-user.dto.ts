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

/**
 * Schema de validação para criação de usuário (admin).
 * Fonte única de verdade: tipo e runtime validation.
 */
export const createUserSchema = z.object({
  email: emailSchema,
  login: loginSchema.optional(),
  name: nameSchema,
  role: z.string().trim().min(1).max(64).optional(),
  status: userStatusSchema.optional(),
  phone: optionalPhoneSchema,
  department: optionalDepartmentSchema,
  jobTitle: optionalJobTitleSchema,
  photoUrl: optionalPhotoUrlSchema,
  preferredLanguage: optionalLanguageSchema,
  timeZone: optionalTimeZoneSchema,
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
