/**
 * Integration tests for the Audit Service API.
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
  process.env.AUDIT_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/audit_service";

describe("Audit Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3009" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.auditEntryModel.deleteMany({});
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
    await container.prisma.auditEntryModel.deleteMany({});
  });

  describe("POST /api/audit-entries (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/audit-entries")
        .send({
          userId: "11111111-1111-1111-1111-111111111111",
          action: "incident.created",
          resourceType: "incident",
        })
        .expect(401);
    });

    it("returns 201 when creating audit entry", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/audit-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: "11111111-1111-1111-1111-111111111111",
          action: "incident.created",
          resourceType: "incident",
          resourceId: "22222222-2222-2222-2222-222222222222",
          metadata: { priority: "high" },
        })
        .expect(201);
      expect(res.body).toMatchObject({
        userId: "11111111-1111-1111-1111-111111111111",
        action: "incident.created",
        resourceType: "incident",
        resourceId: "22222222-2222-2222-2222-222222222222",
        metadata: { priority: "high" },
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when validation fails (missing action)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/audit-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: "11111111-1111-1111-1111-111111111111",
          resourceType: "incident",
        })
        .expect(400);
    });

    it("returns 400 when userId is not a valid UUID", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/audit-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: "not-a-uuid",
          action: "incident.created",
          resourceType: "incident",
        })
        .expect(400);
    });
  });

  describe("GET /api/audit-entries (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/audit-entries").expect(401);
    });

    it("returns 200 with empty array when no entries", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/audit-entries")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with entries when filtered by resourceType", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.auditEntryModel.create({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          action: "incident.created",
          resourceType: "incident",
          resourceId: "22222222-2222-2222-2222-222222222222",
          metadata: null,
        },
      });
      const res = await request(app)
        .get("/api/audit-entries?resourceType=incident")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].resourceType).toBe("incident");
    });
  });

  describe("GET /api/audit-entries/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/audit-entries/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when entry does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/audit-entries/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Audit entry not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 400 when id is not a valid UUID", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/audit-entries/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });

    it("returns 200 with entry", async ({ skip }) => {
      if (!dbAvailable) skip();
      const entry = await container.prisma.auditEntryModel.create({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          action: "request.approved",
          resourceType: "request",
          resourceId: "33333333-3333-3333-3333-333333333333",
          metadata: { approvedBy: "manager" },
        },
      });
      const res = await request(app)
        .get(`/api/audit-entries/${entry.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: entry.id,
        userId: "11111111-1111-1111-1111-111111111111",
        action: "request.approved",
        resourceType: "request",
        resourceId: "33333333-3333-3333-3333-333333333333",
        metadata: { approvedBy: "manager" },
      });
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "audit-service");
    });
  });
});
