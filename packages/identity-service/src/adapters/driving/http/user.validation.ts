import { createValidateBody } from "@pgic/shared";
import { createUserSchema } from "../../../application/dtos/create-user.dto";

export const validateCreateUser = createValidateBody(createUserSchema);
