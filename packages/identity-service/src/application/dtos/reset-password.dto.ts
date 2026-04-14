import { z } from "zod";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "./auth-common.schema";

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "token is required"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, "Password must be at least 8 characters")
    .max(MAX_PASSWORD_LENGTH, "Password must be at most 128 characters"),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
