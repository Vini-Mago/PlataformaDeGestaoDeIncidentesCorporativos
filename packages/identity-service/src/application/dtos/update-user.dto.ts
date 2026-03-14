import { z } from "zod";
import { emailSchema, nameSchema } from "./auth-common.schema";

export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    name: nameSchema.optional(),
  })
  .refine((data) => data.email !== undefined || data.name !== undefined, {
    message: "At least one of email or name is required",
  });

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
