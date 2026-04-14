import { createValidateBody } from "@pgic/shared";
import { registerSchema } from "../../../application/dtos/register.dto";
import { loginSchema } from "../../../application/dtos/login.dto";
import { refreshTokenSchema } from "../../../application/dtos/refresh-token.dto";
import { forgotPasswordSchema } from "../../../application/dtos/forgot-password.dto";
import { resetPasswordSchema } from "../../../application/dtos/reset-password.dto";

export const validateRegister = createValidateBody(registerSchema);
export const validateLogin = createValidateBody(loginSchema);
export const validateRefreshToken = createValidateBody(refreshTokenSchema);
export const validateForgotPassword = createValidateBody(forgotPasswordSchema);
export const validateResetPassword = createValidateBody(resetPasswordSchema);
