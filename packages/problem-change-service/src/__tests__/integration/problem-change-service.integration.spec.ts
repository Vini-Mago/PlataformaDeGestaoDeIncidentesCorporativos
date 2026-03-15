/**
 * Integration tests for the Problem-change Service API.
 * Requires PostgreSQL. RabbitMQ is optional.
 * Run with: pnpm test:integration
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
  process.env.PROBLEM_CHANGE_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/problem_change_service";

describe("Problem-change Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
    rabbitmqUrl: undefined,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3005" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.problemModel.deleteMany({});
      await container.prisma.changeModel.deleteMany({});
      await container.prisma.outboxModel.deleteMany({});
      await container.prisma.replicatedUserModel.deleteMany({});
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
    await container.prisma.problemModel.deleteMany({});
    await container.prisma.changeModel.deleteMany({});
    await container.prisma.outboxModel.deleteMany({});
    await container.prisma.replicatedUserModel.deleteMany({});
  });

  describe("POST /api/problems (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/problems")
        .send({
          title: "Recurring outage",
          description: "Server goes down every Friday",
        })
        .expect(401);
    });

    it("returns 201 when creating problem", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/problems")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Recurring outage",
          description: "Server goes down every Friday",
        })
        .expect(201);
      expect(res.body).toMatchObject({
        title: "Recurring outage",
        description: "Server goes down every Friday",
        createdById: userId,
        status: "Open",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when validation fails (missing title)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/problems")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "Desc" })
        .expect(400);
    });
  });

  describe("GET /api/problems (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/problems").expect(401);
    });

    it("returns 200 with empty array when no problems", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/problems")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with problems when filtered", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.problemModel.create({
        data: {
          title: "Problem 1",
          description: "Desc",
          status: "Open",
          createdById: userId,
        },
      });
      const res = await request(app)
        .get(`/api/problems?createdById=${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].createdById).toBe(userId);
    });

    it("returns 400 when status filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/problems?status=InvalidStatus")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/problems/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/problems/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when problem does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/problems/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Problem not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with problem", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Get Test",
          description: "Desc",
          status: "Open",
          createdById: userId,
        },
      });
      const res = await request(app)
        .get(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: problem.id,
        title: "Get Test",
        status: "Open",
      });
    });
  });

  describe("POST /api/changes (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/changes")
        .send({
          title: "Deploy v2",
          description: "New release",
          justification: "Business need",
          changeType: "Normal",
          risk: "Medium",
        })
        .expect(401);
    });

    it("returns 201 when creating change", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/changes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Deploy v2",
          description: "New release",
          justification: "Business need",
          changeType: "Normal",
          risk: "Medium",
        })
        .expect(201);
      expect(res.body).toMatchObject({
        title: "Deploy v2",
        description: "New release",
        justification: "Business need",
        changeType: "Normal",
        risk: "Medium",
        createdById: userId,
        status: "Draft",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when validation fails (missing justification)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/changes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Title",
          description: "Desc",
          changeType: "Standard",
          risk: "Low",
        })
        .expect(400);
    });
  });

  describe("GET /api/changes (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/changes").expect(401);
    });

    it("returns 200 with empty array when no changes", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/changes")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 400 when risk filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/changes?risk=Critical")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/changes/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/changes/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when change does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/changes/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Change not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with change", async ({ skip }) => {
      if (!dbAvailable) skip();
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Get Test Change",
          description: "Desc",
          justification: "J",
          changeType: "Standard",
          risk: "Low",
          status: "Draft",
          createdById: userId,
        },
      });
      const res = await request(app)
        .get(`/api/changes/${change.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: change.id,
        title: "Get Test Change",
        status: "Draft",
      });
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "problem-change-service");
    });
  });
});
