import { z } from "zod";
import { nameSchema as sharedNameSchema, MAX_NAME_LENGTH as sharedMaxNameLength } from "@pgic/shared";

const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Email: RFC 5321 — endereço completo até 254 caracteres. */
const MAX_EMAIL_LENGTH = 254;

/** Tamanho máximo para nome. Re-exportado do shared. */
export const MAX_NAME_LENGTH = sharedMaxNameLength;
export const MAX_LOGIN_LENGTH = 64;
export const MAX_PHONE_LENGTH = 30;
export const MAX_DEPARTMENT_LENGTH = 120;
export const MAX_JOB_TITLE_LENGTH = 120;
export const MAX_LOCALE_LENGTH = 32;
export const MAX_TIMEZONE_LENGTH = 64;

/**
 * Schema de email reutilizado em register e login.
 * Rejeita strings com < ou > (evita script tags e markup). Limite 254 caracteres (RFC).
 */
export const emailSchema = z
  .string()
  .min(1, "email is required")
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => s.length > 0, "email is required")
  .refine((s) => s.length <= MAX_EMAIL_LENGTH, "Invalid email")
  .refine((s) => !s.includes("<") && !s.includes(">"), "Invalid email")
  .refine((s) => emailFormat.test(s), "Invalid email");

/** Nome de pessoa: mesmo schema do shared (trim, min 1, max 200, sem emoji/tags). */
export const nameSchema = sharedNameSchema;

export const loginSchema = z
  .string()
  .min(3, "login must be at least 3 characters")
  .max(MAX_LOGIN_LENGTH, `login must be at most ${MAX_LOGIN_LENGTH} characters`)
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => /^[a-z0-9._-]+$/.test(s), "login contains invalid characters");

export const userStatusSchema = z.enum(["active", "inactive"]);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(MAX_PHONE_LENGTH)
  .optional()
  .nullable();

export const optionalDepartmentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_DEPARTMENT_LENGTH)
  .optional()
  .nullable();

export const optionalJobTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_JOB_TITLE_LENGTH)
  .optional()
  .nullable();

export const optionalPhotoUrlSchema = z
  .string()
  .trim()
  .url("photoUrl must be a valid URL")
  .optional()
  .nullable();

export const optionalLanguageSchema = z
  .string()
  .trim()
  .min(2)
  .max(MAX_LOCALE_LENGTH)
  .optional()
  .nullable();

export const optionalTimeZoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(MAX_TIMEZONE_LENGTH)
  .optional()
  .nullable();
