import { z } from "zod";

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "identifier is required"),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
