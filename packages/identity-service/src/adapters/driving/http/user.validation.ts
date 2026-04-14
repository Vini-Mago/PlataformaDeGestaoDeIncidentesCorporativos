import { createValidateBody } from "@pgic/shared";
import { z } from "zod";
import { createUserSchema } from "../../../application/dtos/create-user.dto";
import { updateUserSchema } from "../../../application/dtos/update-user.dto";
import { userStatusSchema } from "../../../application/dtos/auth-common.schema";

export const validateCreateUser = createValidateBody(createUserSchema);
export const validateUpdateUser = createValidateBody(updateUserSchema);
export const validateStatusUpdate = createValidateBody(z.object({ status: userStatusSchema }));
export const validateImportUsers = createValidateBody(z.object({ csv: z.string().min(1) }));
