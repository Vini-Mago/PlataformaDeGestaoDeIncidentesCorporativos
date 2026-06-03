/**
 * Integration tests for LGPD Privacy & Compliance scripts.
 * Requires PostgreSQL.
 * Run with: pnpm test:integration
 */
import path from "path";
import { execSync } from "child_process";
import { config as loadEnv } from "dotenv";

const packageRoot = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(packageRoot, "../../.env") });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createContainer } from "../../container";

const databaseUrl =
  process.env.IDENTITY_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:55432/identity_service";

describe("LGPD Privacy & Compliance integration", () => {
  const config = {
    databaseUrl,
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:56379",
    rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://pgic:pgic@localhost:55672",
    jwtSecret: "privacy-test-secret-minimum-32-chars-for-jwt",
    jwtExpiresInSeconds: 3600,
    baseUrl: "http://localhost:3001",
  };

  const container = createContainer(config);

  let dbAvailable = false;
  let testUser: import("../../../generated/prisma-client").UserModel | null = null;

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      dbAvailable = true;
    } catch (err) {
      console.warn("Integration tests: PostgreSQL unreachable.", err);
    }
  });

  afterAll(async () => {
    if (dbAvailable && testUser) {
      try {
        await container.prisma.userModel.delete({ where: { id: testUser.id } }).catch(() => {});
      } catch {
        // Ignore delete errors during teardown
      }
    }
    await container.disconnect();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Clean up any existing test users from previous runs
    await container.prisma.userModel.deleteMany({
      where: {
        email: {
          contains: "privacy",
        },
      },
    });

    // Create seed test user
    testUser = await container.prisma.userModel.create({
      data: {
        email: "test.privacy@example.com",
        login: "test_privacy_user",
        name: "Privacy Test User",
        status: "active",
        phone: "123456789",
        department: "Engineering",
        jobTitle: "Senior Privacy Engineer",
        preferredLanguage: "pt-BR",
        timeZone: "America/Sao_Paulo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("successfully prunes old logs, expired reset tokens, and revoked sessions", async ({ skip }) => {
    if (!dbAvailable) skip();

    const oldDate = new Date("2020-01-01T00:00:00.000Z");

    // 1. Seed old access log
    await container.prisma.accessLogModel.create({
      data: {
        userId: testUser.id,
        eventType: "login",
        result: "success",
        statusCode: 200,
        createdAt: oldDate,
      },
    });

    // 2. Seed old reset token
    await container.prisma.passwordResetTokenModel.create({
      data: {
        userId: testUser.id,
        tokenHash: "token-hash-old-privacy",
        expiresAt: oldDate,
        createdAt: oldDate,
      },
    });

    // 3. Seed old revoked session
    await container.prisma.authSessionModel.create({
      data: {
        userId: testUser.id,
        refreshTokenHash: "session-hash-revoked-privacy",
        lastActivityAt: oldDate,
        expiresAt: oldDate,
        revokedAt: oldDate,
        revokeReason: "logout",
        createdAt: oldDate,
      },
    });

    // 4. Seed a recent active session (should NOT be pruned)
    const activeSession = await container.prisma.authSessionModel.create({
      data: {
        userId: testUser.id,
        refreshTokenHash: "session-hash-active-privacy",
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        createdAt: new Date(),
      },
    });

    // Run the prune script with 0-day parameters to force pruning
    const pruneScriptPath = path.resolve(__dirname, "../../../../../scripts/privacy/prune-identity-data.ts");
    const output = execSync(
      `npx tsx "${pruneScriptPath}" --access-logs-days 0 --password-reset-days 0 --revoked-sessions-days 0`,
      {
        env: {
          ...process.env,
          IDENTITY_DATABASE_URL: databaseUrl,
        },
      }
    ).toString();

    const parsedOutput = JSON.parse(output);
    expect(parsedOutput).toHaveProperty("pruned", true);
    expect(parsedOutput.deleted.accessLogs).toBeGreaterThanOrEqual(1);
    expect(parsedOutput.deleted.passwordResetTokens).toBeGreaterThanOrEqual(1);
    expect(parsedOutput.deleted.revokedSessions).toBeGreaterThanOrEqual(1);

    // Verify deletions in DB
    const oldLogs = await container.prisma.accessLogModel.findMany({
      where: { userId: testUser.id, createdAt: oldDate },
    });
    expect(oldLogs.length).toBe(0);

    const oldTokens = await container.prisma.passwordResetTokenModel.findMany({
      where: { userId: testUser.id, createdAt: oldDate },
    });
    expect(oldTokens.length).toBe(0);

    const oldSessions = await container.prisma.authSessionModel.findMany({
      where: { userId: testUser.id, revokedAt: oldDate },
    });
    expect(oldSessions.length).toBe(0);

    // Verify active session remains unaffected
    const active = await container.prisma.authSessionModel.findUnique({
      where: { refreshTokenHash: activeSession.refreshTokenHash },
    });
    expect(active).toBeDefined();
    expect(active?.revokedAt).toBeNull();
  }, 15000);

  it("successfully anonymizes a user account by masking profile fields and revoking credentials", async ({ skip }) => {
    if (!dbAvailable) skip();

    const activeSession = await container.prisma.authSessionModel.create({
      data: {
        userId: testUser.id,
        refreshTokenHash: "session-hash-to-anonymize",
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        createdAt: new Date(),
      },
    });

    // Seed OAuth account
    await container.prisma.oAuthAccountModel.create({
      data: {
        userId: testUser.id,
        provider: "google",
        providerId: "google-privacy-id",
        createdAt: new Date(),
      },
    });

    // Run anonymization script
    const anonScriptPath = path.resolve(__dirname, "../../../../../scripts/privacy/anonymize-identity-user.ts");
    const output = execSync(`npx tsx "${anonScriptPath}" --user-id ${testUser.id}`, {
      env: {
        ...process.env,
        IDENTITY_DATABASE_URL: databaseUrl,
      },
    }).toString();

    const parsedOutput = JSON.parse(output);
    expect(parsedOutput).toHaveProperty("anonymized", true);
    expect(parsedOutput.userId).toBe(testUser.id);
    expect(parsedOutput.newIdentity.email).toMatch(/^anon\+[a-f0-9]+@example\.invalid$/);

    // Verify DB states after anonymization
    const dbUser = await container.prisma.userModel.findUnique({
      where: { id: testUser.id },
    });

    expect(dbUser).toBeDefined();
    expect(dbUser?.status).toBe("inactive");
    expect(dbUser?.phone).toBeNull();
    expect(dbUser?.department).toBeNull();
    expect(dbUser?.jobTitle).toBeNull();
    expect(dbUser?.photoUrl).toBeNull();
    expect(dbUser?.preferredLanguage).toBeNull();
    expect(dbUser?.timeZone).toBeNull();
    expect(dbUser?.name).toMatch(/^Anonymized User [a-f0-9]+$/);
    expect(dbUser?.email).toMatch(/^anon\+[a-f0-9]+@example\.invalid$/);
    expect(dbUser?.login).toMatch(/^anon_[a-f0-9]+$/);

    // Verify session was revoked
    const session = await container.prisma.authSessionModel.findUnique({
      where: { refreshTokenHash: activeSession.refreshTokenHash },
    });
    expect(session?.revokedAt).not.toBeNull();
    expect(session?.revokeReason).toBe("lgpd_anonymization");

    // Verify OAuth accounts were deleted
    const oauths = await container.prisma.oAuthAccountModel.findMany({
      where: { userId: testUser.id },
    });
    expect(oauths.length).toBe(0);
  }, 15000);
});
