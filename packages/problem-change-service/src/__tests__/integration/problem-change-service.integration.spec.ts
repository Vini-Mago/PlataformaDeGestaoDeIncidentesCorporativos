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
import { PROBLEM_INCIDENT_LINKED_EVENT, PROBLEM_INCIDENT_UNLINKED_EVENT } from "@pgic/shared";

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
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "admin" });

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
    const readOwnPerms = ["problems:read:own"];
    const ownUserId = "44444444-4444-4444-4444-444444444444";
    const otherUserId = "55555555-5555-5555-5555-555555555555";

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
      expect(res.body).toHaveProperty("linkedIncidentIds");
      expect(Array.isArray(res.body.linkedIncidentIds)).toBe(true);
    });

    it("returns 403 when user has read:own and is not owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-problems@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Owned by other",
          description: "Desc",
          status: "Open",
          createdById: otherUserId,
        },
      });
      await request(app)
        .get(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns 200 when user has read:own and is owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-problems@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Owned by self",
          description: "Desc",
          status: "Open",
          createdById: ownUserId,
        },
      });
      const res = await request(app)
        .get(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBe(problem.id);
    });

    const incidentA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    it("links incident ids and returns them on GET (RF-7.1)", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Linked",
          description: "D",
          status: "Open",
          createdById: userId,
        },
      });

      await request(app)
        .post(`/api/problems/${problem.id}/incidents`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ incidentId: incidentA })
        .expect(204);

      const outboxAfterLink = await container.prisma.outboxModel.findMany({
        orderBy: { createdAt: "asc" },
      });
      expect(outboxAfterLink.some((e) => e.eventName === PROBLEM_INCIDENT_LINKED_EVENT)).toBe(true);

      const res = await request(app)
        .get(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.linkedIncidentIds).toEqual([incidentA]);

      await request(app)
        .delete(`/api/problems/${problem.id}/incidents/${incidentA}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);

      const outboxAfterUnlink = await container.prisma.outboxModel.findMany({
        orderBy: { createdAt: "asc" },
      });
      expect(outboxAfterUnlink.some((e) => e.eventName === PROBLEM_INCIDENT_UNLINKED_EVENT)).toBe(true);

      const afterUnlink = await request(app)
        .get(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(afterUnlink.body.linkedIncidentIds).toEqual([]);
    });

    it("returns 404 when linking to unknown problem", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/problems/00000000-0000-0000-0000-000000000000/incidents")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ incidentId: incidentA })
        .expect(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/changes/:id (auth required)", () => {
    const readOwnPerms = ["changes:read:own"];
    const ownUserId = "66666666-6666-6666-6666-666666666666";
    const otherUserId = "77777777-7777-7777-7777-777777777777";

    it("returns 403 when user has read:own and is not owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-changes@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Change owned by other",
          description: "Desc",
          justification: "Ownership check",
          changeType: "Normal",
          status: "Draft",
          risk: "Medium",
          createdById: otherUserId,
        },
      });
      await request(app)
        .get(`/api/changes/${change.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns 200 when user has read:own and is owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-changes@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Change owned by self",
          description: "Desc",
          justification: "Ownership check",
          changeType: "Normal",
          status: "Draft",
          risk: "Medium",
          createdById: ownUserId,
        },
      });
      const res = await request(app)
        .get(`/api/changes/${change.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBe(change.id);
    });
  });

  describe("GET /api/changes/:id/versions (auth required)", () => {
    const ownUserId = "66666666-6666-6666-6666-666666666666";
    const otherUserId = "77777777-7777-7777-7777-777777777777";

    it("returns 403 when user has changes:read:own and is not owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-changes@test.com",
        role: "user",
        perms: ["changes:read:own"],
      });
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Change version owned by other",
          description: "Desc",
          justification: "J",
          changeType: "Normal",
          risk: "Medium",
          status: "Draft",
          createdById: otherUserId,
        },
      });
      await container.prisma.changeVersionModel.create({
        data: {
          changeId: change.id,
          versionNumber: 1,
          changedById: otherUserId,
          snapshot: { after: { title: change.title } },
        },
      });

      await request(app)
        .get(`/api/changes/${change.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns versions when user has changes:read:own and is owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-changes@test.com",
        role: "user",
        perms: ["changes:read:own"],
      });
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Change version owned by self",
          description: "Desc",
          justification: "J",
          changeType: "Normal",
          risk: "Medium",
          status: "Draft",
          createdById: ownUserId,
        },
      });
      await container.prisma.changeVersionModel.create({
        data: {
          changeId: change.id,
          versionNumber: 1,
          changedById: ownUserId,
          snapshot: { after: { title: change.title } },
        },
      });

      const res = await request(app)
        .get(`/api/changes/${change.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({ versionNumber: 1, changedById: ownUserId });
    });

    it("returns versions when user has changes:read:all", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "all-changes@test.com",
        role: "user",
        perms: ["changes:read:all"],
      });
      const change = await container.prisma.changeModel.create({
        data: {
          title: "Change version read all",
          description: "Desc",
          justification: "J",
          changeType: "Normal",
          risk: "Medium",
          status: "Draft",
          createdById: otherUserId,
        },
      });
      await container.prisma.changeVersionModel.create({
        data: {
          changeId: change.id,
          versionNumber: 1,
          changedById: otherUserId,
          snapshot: { after: { title: change.title } },
        },
      });

      const res = await request(app)
        .get(`/api/changes/${change.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
    });
  });

  describe("PATCH /api/problems/:id (RF-7.2 — auth + problems:update:all)", () => {
    const noPermToken = createTestJwt({
      sub: userId,
      email: "noperm@test.com",
      role: "user",
      perms: ["problems:read:all"],
    });

    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .patch("/api/problems/11111111-1111-1111-1111-111111111111")
        .send({ rootCause: "x" })
        .expect(401);
    });

    it("returns 403 when JWT lacks problems:update:all", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .patch("/api/problems/11111111-1111-1111-1111-111111111111")
        .set("Authorization", `Bearer ${noPermToken}`)
        .send({ rootCause: "x" })
        .expect(403);
    });

    it("returns 400 when body has no updatable fields", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Patch empty body",
          description: "D",
          status: "Open",
          createdById: userId,
        },
      });
      await request(app)
        .patch(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it("returns 200 and updates causa raiz / plano", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Patch fields",
          description: "D",
          status: "Open",
          createdById: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          rootCause: "Firewall mal configurado",
          actionPlan: "Rever regras na próxima janela",
        })
        .expect(200);
      expect(res.body).toMatchObject({
        id: problem.id,
        rootCause: "Firewall mal configurado",
        actionPlan: "Rever regras na próxima janela",
        status: "Open",
      });
      expect(res.body).toHaveProperty("linkedIncidentIds");
    });

    it("returns 400 on invalid status transition", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Closed prob",
          description: "D",
          status: "Closed",
          createdById: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/problems/${problem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "Resolved" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/problems/linked-for-incidents (auth required)", () => {
    it("returns 403 when user only has problems:read:own", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: userId,
        email: "own-problems@test.com",
        role: "user",
        perms: ["problems:read:own"],
      });
      await request(app)
        .get("/api/problems/linked-for-incidents?incidentIds=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns link rows for requested incident ids", async ({ skip }) => {
      if (!dbAvailable) skip();
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Bulk link test",
          description: "D",
          status: "Open",
          createdById: userId,
        },
      });
      const incidentX = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
      await container.prisma.problemLinkedIncidentModel.create({
        data: {
          problemId: problem.id,
          incidentId: incidentX,
        },
      });

      const res = await request(app)
        .get(`/api/problems/linked-for-incidents?incidentIds=${encodeURIComponent(incidentX)}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        incidentId: incidentX,
        problemId: problem.id,
        problemTitle: "Bulk link test",
      });
    });

    it("returns 400 when incidentIds missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/problems/linked-for-incidents")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe("GET /api/problems/:id/versions (auth required)", () => {
    const ownUserId = "44444444-4444-4444-4444-444444444444";
    const otherUserId = "55555555-5555-5555-5555-555555555555";

    it("returns 403 when user has problems:read:own and is not owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-problems@test.com",
        role: "user",
        perms: ["problems:read:own"],
      });
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Version owned by other",
          description: "Desc",
          status: "Open",
          createdById: otherUserId,
        },
      });
      await container.prisma.problemVersionModel.create({
        data: {
          problemId: problem.id,
          versionNumber: 1,
          changedById: otherUserId,
          snapshot: { after: { title: problem.title } },
        },
      });

      await request(app)
        .get(`/api/problems/${problem.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns versions when user has problems:read:own and is owner", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "own-problems@test.com",
        role: "user",
        perms: ["problems:read:own"],
      });
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Version owned by self",
          description: "Desc",
          status: "Open",
          createdById: ownUserId,
        },
      });
      await container.prisma.problemVersionModel.create({
        data: {
          problemId: problem.id,
          versionNumber: 1,
          changedById: ownUserId,
          snapshot: { after: { title: problem.title } },
        },
      });

      const res = await request(app)
        .get(`/api/problems/${problem.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({ versionNumber: 1, changedById: ownUserId });
    });

    it("returns versions when user has problems:read:all", async ({ skip }) => {
      if (!dbAvailable) skip();
      const token = createTestJwt({
        sub: ownUserId,
        email: "all-problems@test.com",
        role: "user",
        perms: ["problems:read:all"],
      });
      const problem = await container.prisma.problemModel.create({
        data: {
          title: "Version read all",
          description: "Desc",
          status: "Open",
          createdById: otherUserId,
        },
      });
      await container.prisma.problemVersionModel.create({
        data: {
          problemId: problem.id,
          versionNumber: 1,
          changedById: otherUserId,
          snapshot: { after: { title: problem.title } },
        },
      });

      const res = await request(app)
        .get(`/api/problems/${problem.id}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
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
      expect(res.body.linkedIncidentIds).toEqual([]);
      expect(res.body.linkedProblemIds).toEqual([]);
    });
  });

  describe("PATCH /api/changes/:id (RF-7.3 — CAB High)", () => {
    it("returns 400 when High risk jumps Submitted -> Approved with CAB policy", async ({ skip }) => {
      if (!dbAvailable) skip();
      const row = await container.prisma.changeModel.create({
        data: {
          title: "CAB test",
          description: "D",
          justification: "J",
          changeType: "Normal",
          risk: "High",
          status: "Submitted",
          createdById: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/changes/${row.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "Approved" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 200 when Low risk moves Submitted -> Approved", async ({ skip }) => {
      if (!dbAvailable) skip();
      const row = await container.prisma.changeModel.create({
        data: {
          title: "Fast track",
          description: "D",
          justification: "J",
          changeType: "Standard",
          risk: "Low",
          status: "Submitted",
          createdById: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/changes/${row.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "Approved" })
        .expect(200);
      expect(res.body).toMatchObject({ id: row.id, status: "Approved" });
      expect(res.body.linkedIncidentIds).toEqual([]);
      expect(res.body.linkedProblemIds).toEqual([]);
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "problem-change-service");
    });
  });
});
