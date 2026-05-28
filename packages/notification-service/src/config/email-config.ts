import type { SmtpEmailSenderConfig } from "../adapters/driven/email/smtp-email-sender.adapter";

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export interface EmailConfigEnv {
  EMAIL_PROVIDER?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_REQUIRE_TLS?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
  SMTP_CONNECTION_TIMEOUT_MS?: string;
  SMTP_MESSAGE_TIMEOUT_MS?: string;
}

function parsePositiveInt(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value.trim() === "") return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new EmailConfigurationError(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function requireEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new EmailConfigurationError(`${name} must be set when EMAIL_PROVIDER=smtp`);
  return trimmed;
}

export function buildEmailConfigFromEnv(env: EmailConfigEnv, isProduction: boolean): SmtpEmailSenderConfig | undefined {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (!provider) {
    if (isProduction) {
      throw new EmailConfigurationError("EMAIL_PROVIDER must be set in production");
    }
    return undefined;
  }

  if (provider !== "smtp") {
    throw new EmailConfigurationError(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  const port = parsePositiveInt(env.SMTP_PORT, 25, "SMTP_PORT");
  const secure = parseBoolean(env.SMTP_SECURE, port === 465);
  const requireTls = parseBoolean(env.SMTP_REQUIRE_TLS, !secure && port === 587);

  return {
    fromAddress: requireEnv(env.EMAIL_FROM_ADDRESS, "EMAIL_FROM_ADDRESS"),
    fromName: env.EMAIL_FROM_NAME?.trim() || "PGIC",
    host: requireEnv(env.SMTP_HOST, "SMTP_HOST"),
    port,
    secure,
    requireTls,
    username: env.SMTP_USERNAME?.trim() || undefined,
    password: env.SMTP_PASSWORD?.trim() || undefined,
    connectionTimeoutMs: parsePositiveInt(env.SMTP_CONNECTION_TIMEOUT_MS, 10000, "SMTP_CONNECTION_TIMEOUT_MS"),
    messageTimeoutMs: parsePositiveInt(env.SMTP_MESSAGE_TIMEOUT_MS, 15000, "SMTP_MESSAGE_TIMEOUT_MS"),
  };
}
