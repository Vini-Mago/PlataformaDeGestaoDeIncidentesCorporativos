import { z } from "zod";
import { emailSchema, loginSchema as userLoginSchema, MAX_PASSWORD_LENGTH } from "./auth-common.schema";

/**
 * Schema de validação para login.
 * Fonte única de verdade: tipo e runtime validation.
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "identifier is required")
    .max(254, "identifier is too long")
    .optional(),
  email: emailSchema.optional(),
  login: userLoginSchema.optional(),
  password: z
    .string()
    .min(1, "password is required")
    .max(MAX_PASSWORD_LENGTH, "Password must be at most 128 characters"),
}).refine((data) => Boolean(data.identifier || data.email || data.login), {
  message: "identifier or email/login is required",
});

export type LoginDto = z.infer<typeof loginSchema>;
