/**
 * Integration tests for the Incident Service API.
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
  process.env.INCIDENT_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/incident_service";

describe("Incident Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
    rabbitmqUrl: undefined,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3004" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.incidentCommentModel.deleteMany({});
      await container.prisma.incidentStatusHistoryModel.deleteMany({});
      await container.prisma.incidentModel.deleteMany({});
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
    await container.prisma.incidentCommentModel.deleteMany({});
    await container.prisma.incidentStatusHistoryModel.deleteMany({});
    await container.prisma.incidentModel.deleteMany({});
    await container.prisma.outboxModel.deleteMany({});
    await container.prisma.replicatedUserModel.deleteMany({});
  });

  describe("POST /api/incidents (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/incidents")
        .send({
          title: "Server down",
          description: "Production server not responding",
          criticality: "High",
          serviceAffected: "api",
        })
        .expect(401);
    });

    it("returns 201 when creating incident", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/incidents")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Server down",
          description: "Production server not responding",
          criticality: "High",
          serviceAffected: "api-gateway",
        })
        .expect(201);
      expect(res.body).toMatchObject({
        title: "Server down",
        description: "Production server not responding",
        criticality: "High",
        serviceAffected: "api-gateway",
        requesterId: userId,
        status: "Open",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when validation fails (missing title)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/incidents")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Desc",
          criticality: "Medium",
        })
        .expect(400);
    });
  });

  describe("GET /api/incidents (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/incidents").expect(401);
    });

    it("returns 200 with empty array when no incidents", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/incidents")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with incidents when filtered", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.incidentModel.create({
        data: {
          title: "Incident 1",
          description: "Desc",
          status: "Open",
          criticality: "Medium",
          requesterId: userId,
        },
      });
      const res = await request(app)
        .get(`/api/incidents?requesterId=${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].requesterId).toBe(userId);
    });

    it("returns 400 when status filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/incidents?status=InvalidStatus")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/incidents/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/incidents/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when incident does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/incidents/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty("error", "Incident not found: 00000000-0000-0000-0000-000000000000");
    });

    it("returns 200 with incident and comments", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Get Test",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: userId,
        },
      });
      const res = await request(app)
        .get(`/api/incidents/${incident.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: incident.id,
        title: "Get Test",
        status: "Open",
      });
      expect(res.body).toHaveProperty("comments");
      expect(Array.isArray(res.body.comments)).toBe(true);
    });
  });

  describe("PATCH /api/incidents/:id/status (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .patch("/api/incidents/11111111-1111-1111-1111-111111111111/status")
        .send({ toStatus: "InAnalysis" })
        .expect(401);
    });

    it("returns 404 when incident does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .patch("/api/incidents/00000000-0000-0000-0000-000000000000/status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ toStatus: "InAnalysis" })
        .expect(404);
    });

    it("updates status successfully", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Status Test",
          description: "Desc",
          status: "Open",
          criticality: "Medium",
          requesterId: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/incidents/${incident.id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ toStatus: "InAnalysis", comment: "Starting analysis" })
        .expect(200);
      expect(res.body.status).toBe("InAnalysis");
    });

    it("returns 400 when transition is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Invalid Transition",
          description: "Desc",
          status: "Open",
          criticality: "Medium",
          requesterId: userId,
        },
      });
      const res = await request(app)
        .patch(`/api/incidents/${incident.id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ toStatus: "Completed" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PATCH /api/incidents/:id/assign (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .patch("/api/incidents/11111111-1111-1111-1111-111111111111/assign")
        .send({ assignedToId: "u2" })
        .expect(401);
    });

    it("returns 404 when incident does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const validAssigneeId = "22222222-2222-2222-2222-222222222222";
      await request(app)
        .patch("/api/incidents/00000000-0000-0000-0000-000000000000/assign")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ assignedToId: validAssigneeId })
        .expect(404);
    });

    it("assigns incident successfully", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Assign Test",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: userId,
        },
      });
      const assignedToId = "22222222-2222-2222-2222-222222222222";
      const res = await request(app)
        .patch(`/api/incidents/${incident.id}/assign`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ assignedToId })
        .expect(200);
      expect(res.body.assignedToId).toBe(assignedToId);
    });
  });

  describe("POST /api/incidents/:id/comments (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/incidents/11111111-1111-1111-1111-111111111111/comments")
        .send({ body: "Comment" })
        .expect(401);
    });

    it("returns 404 when incident does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/incidents/00000000-0000-0000-0000-000000000000/comments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "Comment" })
        .expect(404);
    });

    it("returns 201 when adding comment", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Comment Test",
          description: "Desc",
          status: "Open",
          criticality: "Medium",
          requesterId: userId,
        },
      });
      const res = await request(app)
        .post(`/api/incidents/${incident.id}/comments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "My comment" })
        .expect(201);
      expect(res.body).toMatchObject({
        incidentId: incident.id,
        authorId: userId,
        body: "My comment",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when body is empty", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Empty Comment",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: userId,
        },
      });
      await request(app)
        .post(`/api/incidents/${incident.id}/comments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "" })
        .expect(400);
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "incident-service");
    });
  });
});
