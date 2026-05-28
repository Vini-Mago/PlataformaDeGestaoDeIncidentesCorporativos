import { describe, expect, it } from "vitest";
import { buildEmailConfigFromEnv, EmailConfigurationError } from "./email-config";

describe("buildEmailConfigFromEnv", () => {
  it("returns undefined for missing provider outside production", () => {
    expect(buildEmailConfigFromEnv({}, false)).toBeUndefined();
  });

  it("fails in production when provider is missing", () => {
    expect(() => buildEmailConfigFromEnv({}, true)).toThrow(EmailConfigurationError);
  });

  it("fails when smtp is missing required settings", () => {
    expect(() => buildEmailConfigFromEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.example.com" }, true))
      .toThrow(/EMAIL_FROM_ADDRESS/);
  });

  it("defaults port 587 to STARTTLS required", () => {
    const config = buildEmailConfigFromEnv({
      EMAIL_PROVIDER: "smtp",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    }, true);

    expect(config).toMatchObject({
      port: 587,
      secure: false,
      requireTls: true,
    });
  });

  it("defaults port 465 to implicit TLS", () => {
    const config = buildEmailConfigFromEnv({
      EMAIL_PROVIDER: "smtp",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
    }, true);

    expect(config).toMatchObject({
      port: 465,
      secure: true,
      requireTls: false,
    });
  });
});
