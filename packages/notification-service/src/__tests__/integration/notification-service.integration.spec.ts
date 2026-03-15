/**
 * Integration tests for the Notification Service API.
 * Requires PostgreSQL. Run with: pnpm test:integration
 */
import path from "path";
import { config as loadEnv } from "dotenv";
const packageRoot = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(packageRoot, "../../../.env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createContainer } from "../../container";
import { createApp } from "../../app";
import { createTestJwt, TEST_JWT_SECRET } from "./test-jwt";

const databaseUrl =
  process.env.NOTIFICATION_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/notification_service";

describe("Notification Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3008" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.notificationModel.deleteMany({});
      dbAvailable = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Integration tests: PostgreSQL unreachable.", msg);
    }
  });

  afterAll(async () => {
    await container.disconnect();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await container.prisma.notificationModel.deleteMany({});
  });

  describe("POST /api/notifications (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/notifications")
        .send({
          type: "email",
          recipient: "user@example.com",
          subject: "Test",
        })
        .expect(401);
    });

    it("returns 201 when creating notification", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "email",
          recipient: "user@example.com",
          subject: "Test subject",
          body: "Test body",
        })
        .expect(201);
      expect(res.body).toMatchObject({
        type: "email",
        recipient: "user@example.com",
        subject: "Test subject",
        body: "Test body",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when validation fails (missing subject)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "email",
          recipient: "user@example.com",
        })
        .expect(400);
    });

    it("returns 400 when type is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "sms",
          recipient: "user@example.com",
          subject: "Test",
        })
        .expect(400);
    });
  });

  describe("GET /api/notifications (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/notifications").expect(401);
    });

    it("returns 200 with empty array when no notifications", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with notifications when filtered by type", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.notificationModel.create({
        data: {
          type: "email",
          recipient: "a@b.com",
          subject: "S1",
          body: null,
        },
      });
      const res = await request(app)
        .get("/api/notifications?type=email")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe("email");
    });

    it("returns 400 when type filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/notifications?type=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/notifications/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/notifications/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when notification does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/notifications/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Notification not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with notification", async ({ skip }) => {
      if (!dbAvailable) skip();
      const notif = await container.prisma.notificationModel.create({
        data: {
          type: "in_app",
          recipient: "user-123",
          subject: "Alert",
          body: "Body",
        },
      });
      const res = await request(app)
        .get(`/api/notifications/${notif.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: notif.id,
        type: "in_app",
        recipient: "user-123",
        subject: "Alert",
        body: "Body",
      });
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "notification-service");
    });
  });
});
