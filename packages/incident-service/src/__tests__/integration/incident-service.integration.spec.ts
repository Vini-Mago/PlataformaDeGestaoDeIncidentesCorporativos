/**
 * Integration tests for the Incident Service API.
 * Requires PostgreSQL. RabbitMQ is optional.
 * Run with: pnpm test:integration
 */
import path from "path";
import { config as loadEnv } from "dotenv";
const packageRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(packageRoot, "../..");
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createContainer } from "../../container";
import { createApp } from "../../app";
import { createTestJwt, TEST_JWT_SECRET } from "./test-jwt";

const databaseUrl = process.env.INCIDENT_DATABASE_URL;
const unavailableDatabaseUrl = "postgresql://pgic:pgic@127.0.0.1:1/incident_service";

describe("Incident Service API integration", () => {
  const config = {
    databaseUrl: databaseUrl ?? unavailableDatabaseUrl,
    jwtSecret: TEST_JWT_SECRET,
    rabbitmqUrl: undefined,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3004" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "admin" });

  beforeAll(async () => {
    if (!databaseUrl) {
      console.warn("Integration tests: missing INCIDENT_DATABASE_URL. Load repo .env or export it explicitly.");
      return;
    }
    try {
      await container.prisma.$connect();
      await container.prisma.incidentAttachmentModel.deleteMany({});
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
    await container.prisma.incidentAttachmentModel.deleteMany({});
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

    it("returns 200 with incident, comments and status history", async ({ skip }) => {
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
      await container.prisma.incidentStatusHistoryModel.create({
        data: {
          incidentId: incident.id,
          fromStatus: "Open",
          toStatus: "InAnalysis",
          changedById: userId,
          comment: "Started triage",
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
      expect(res.body).toHaveProperty("statusHistory");
      expect(res.body.statusHistory).toEqual([
        expect.objectContaining({
          incidentId: incident.id,
          fromStatus: "Open",
          toStatus: "InAnalysis",
          changedById: userId,
          comment: "Started triage",
        }),
      ]);
    });

    const readOwnPerms = ["incidents:read:own"];
    const otherUserId = "22222222-2222-2222-2222-222222222222";

    it("returns 404 when incident does not exist (read:own token)", async ({ skip }) => {
      if (!dbAvailable) skip();
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const res = await request(app)
        .get("/api/incidents/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(404);
      expect(res.body).toHaveProperty("error", "Incident not found: 00000000-0000-0000-0000-000000000000");
    });

    it("returns 403 when incident exists but user has read:own and is not a participant", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Other user incident",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: otherUserId,
        },
      });
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const res = await request(app)
        .get(`/api/incidents/${incident.id}`)
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(403);
      expect(res.body).toHaveProperty("error", "Forbidden");
    });

    it("returns 200 when user has read:own and is requester", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Own incident",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: userId,
        },
      });
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnPerms,
      });
      const res = await request(app)
        .get(`/api/incidents/${incident.id}`)
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: incident.id, title: "Own incident" });
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

  describe("Incident attachments (auth required)", () => {
    it("returns 201 when adding an allowed attachment and lists metadata", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Attachment Test",
          description: "Desc",
          status: "Open",
          criticality: "Medium",
          requesterId: userId,
        },
      });

      const contentBase64 = Buffer.from("hello attachment").toString("base64");
      const created = await request(app)
        .post(`/api/incidents/${incident.id}/attachments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fileName: "evidence.txt",
          mimeType: "text/plain",
          contentBase64,
        })
        .expect(201);

      expect(created.body).toMatchObject({
        incidentId: incident.id,
        uploadedById: userId,
        fileName: "evidence.txt",
        mimeType: "text/plain",
        sizeBytes: "hello attachment".length,
      });
      expect(created.body).toHaveProperty("id");

      const stored = await container.prisma.incidentAttachmentModel.findUniqueOrThrow({
        where: { id: created.body.id },
      });
      expect(Buffer.from(stored.content).toString("utf8")).toBe("hello attachment");

      const list = await request(app)
        .get(`/api/incidents/${incident.id}/attachments`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(list.body).toEqual([
        expect.objectContaining({
          id: created.body.id,
          fileName: "evidence.txt",
          sizeBytes: "hello attachment".length,
        }),
      ]);
      expect(list.body[0]).not.toHaveProperty("content");
    });

    it("returns 400 when attachment mime type is not allowed", async ({ skip }) => {
      if (!dbAvailable) skip();
      const incident = await container.prisma.incidentModel.create({
        data: {
          title: "Bad Attachment",
          description: "Desc",
          status: "Open",
          criticality: "Low",
          requesterId: userId,
        },
      });

      await request(app)
        .post(`/api/incidents/${incident.id}/attachments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fileName: "script.js",
          mimeType: "application/javascript",
          contentBase64: Buffer.from("alert(1)").toString("base64"),
        })
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
