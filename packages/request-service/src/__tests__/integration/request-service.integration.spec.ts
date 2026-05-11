/**
 * Integration tests for the Request Service API.
 * Requires PostgreSQL. RabbitMQ is not required (consumers are null when RABBITMQ_URL is unset).
 * Run with: pnpm test:integration
 */
import path from "path";
import { config as loadEnv } from "dotenv";
const packageRoot = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(packageRoot, "../../.env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createContainer } from "../../container";
import { createApp } from "../../app";
import { createTestJwt, TEST_JWT_SECRET } from "./test-jwt";

const databaseUrl =
  process.env.REQUEST_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/request_service";

describe("Request Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
    rabbitmqUrl: undefined,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3002" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "admin" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.serviceRequestCommentModel.deleteMany({});
      await container.prisma.serviceRequestModel.deleteMany({});
      await container.prisma.serviceCatalogItemModel.deleteMany({});
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
    await container.prisma.serviceRequestCommentModel.deleteMany({});
    await container.prisma.serviceRequestModel.deleteMany({});
  });

  describe("GET /api/catalog-items (public)", () => {
    it("returns 200 and empty array when no catalog items", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app).get("/api/catalog-items").expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with catalog items after seeding", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.serviceCatalogItemModel.create({
        data: {
          name: "Access Request",
          description: "IT access",
          category: "IT",
          approvalFlow: "none",
          approverRoleIds: [],
        },
      });
      const res = await request(app).get("/api/catalog-items").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toMatchObject({
        name: "Access Request",
        description: "IT access",
        category: "IT",
      });
    });
  });

  describe("GET /api/catalog-items/:id (public)", () => {
    it("returns 404 when catalog item does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/catalog-items/00000000-0000-0000-0000-000000000000")
        .expect(404);
      expect(res.body).toHaveProperty("error", "Catalog item not found: 00000000-0000-0000-0000-000000000000");
    });

    it("returns 200 with catalog item when found", async ({ skip }) => {
      if (!dbAvailable) skip();
      const created = await container.prisma.serviceCatalogItemModel.create({
        data: {
          name: "Get Test Item",
          description: null,
          category: null,
          approvalFlow: "none",
          approverRoleIds: [],
        },
      });
      const res = await request(app)
        .get(`/api/catalog-items/${created.id}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: created.id,
        name: "Get Test Item",
      });
    });
  });

  describe("POST /api/catalog-items (auth required)", () => {
    it("returns 401 when Authorization header is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/catalog-items")
        .send({ name: "New Item", description: "Desc" })
        .expect(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 401 when token is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/catalog-items")
        .set("Authorization", "Bearer invalid-token")
        .send({ name: "New Item" })
        .expect(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 201 when authenticated user creates catalog item", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/catalog-items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Created Item", description: "Created via API" })
        .expect(201);
      expect(res.body).toMatchObject({
        name: "Created Item",
        description: "Created via API",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });
  });

  describe("POST /api/service-requests (auth required)", () => {
    let catalogItemId: string;

    beforeAll(async () => {
      if (!dbAvailable) return;
      const item = await container.prisma.serviceCatalogItemModel.create({
        data: {
          name: "Request Test Catalog",
          approvalFlow: "none",
          approverRoleIds: [],
        },
      });
      catalogItemId = item.id;
    });

    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/service-requests")
        .send({ catalogItemId, formData: null })
        .expect(401);
    });

    it("returns 201 when creating service request", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/service-requests")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ catalogItemId, formData: { reason: "Need access" } })
        .expect(201);
      expect(res.body).toMatchObject({
        catalogItemId,
        requesterId: userId,
        status: "Draft",
        formData: { reason: "Need access" },
      });
      expect(res.body).toHaveProperty("id");
    });

    it("returns 404 when catalog item does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/service-requests")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ catalogItemId: "00000000-0000-0000-0000-000000000000" })
        .expect(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/service-requests (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/service-requests").expect(401);
    });

    it("returns 200 with empty array when no requests", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/service-requests")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with filtered list when requesterId provided", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "F", approvalFlow: "none", approverRoleIds: [] },
      });
      await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      const res = await request(app)
        .get(`/api/service-requests?requesterId=${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((r: { requesterId: string }) => r.requesterId === userId)).toBe(true);
    });

    it("returns 400 when status filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/service-requests?status=InvalidStatus")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/service-requests/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/service-requests/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when request does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/service-requests/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty("error", "Service request not found: 00000000-0000-0000-0000-000000000000");
    });

    it("returns 200 with request and comments", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "G", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      const res = await request(app)
        .get(`/api/service-requests/${req.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: req.id,
        requesterId: userId,
        status: "Draft",
      });
      expect(res.body).toHaveProperty("comments");
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body).toHaveProperty("workflowEvents");
      expect(Array.isArray(res.body.workflowEvents)).toBe(true);
    });

    const readOwnReqPerms = ["requests:read:own"];
    const otherUserId = "22222222-2222-2222-2222-222222222222";

    it("returns 404 when request does not exist (read:own token)", async ({ skip }) => {
      if (!dbAvailable) skip();
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnReqPerms,
      });
      const res = await request(app)
        .get("/api/service-requests/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(404);
      expect(res.body).toHaveProperty("error", "Service request not found: 00000000-0000-0000-0000-000000000000");
    });

    it("returns 403 when request exists but user has read:own and is not participant", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "Other SR", approvalFlow: "none", approverRoleIds: [] },
      });
      const sr = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: otherUserId,
          status: "Draft",
        },
      });
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnReqPerms,
      });
      const res = await request(app)
        .get(`/api/service-requests/${sr.id}`)
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(403);
      expect(res.body).toHaveProperty("error", "Forbidden");
    });

    it("returns 200 when user has read:own and is requester", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "Own SR", approvalFlow: "none", approverRoleIds: [] },
      });
      const sr = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      const tokenOwn = createTestJwt({
        sub: userId,
        email: "own@test.com",
        role: "user",
        perms: readOwnReqPerms,
      });
      const res = await request(app)
        .get(`/api/service-requests/${sr.id}`)
        .set("Authorization", `Bearer ${tokenOwn}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: sr.id, requesterId: userId });
    });
  });

  describe("POST /api/service-requests/:id/submit (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/service-requests/11111111-1111-1111-1111-111111111111/submit")
        .expect(401);
    });

    it("returns 404 when request does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/service-requests/00000000-0000-0000-0000-000000000000/submit")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("submits Draft request successfully", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "H", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      const res = await request(app)
        .post(`/api/service-requests/${req.id}/submit`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.status).toBe("Submitted");
      expect(res.body).toHaveProperty("submittedAt");

      const getRes = await request(app)
        .get(`/api/service-requests/${req.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(getRes.body.workflowEvents.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.workflowEvents[0]).toMatchObject({
        fromStatus: "Draft",
        toStatus: "Submitted",
        actorId: userId,
      });
    });

    it("returns 400 when submitting already Submitted request", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "I", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Submitted",
          submittedAt: new Date(),
        },
      });
      const res = await request(app)
        .post(`/api/service-requests/${req.id}/submit`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/service-requests/:id/comments (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/service-requests/11111111-1111-1111-1111-111111111111/comments")
        .send({ body: "Comment" })
        .expect(401);
    });

    it("returns 404 when request does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/service-requests/00000000-0000-0000-0000-000000000000/comments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "Comment" })
        .expect(404);
    });

    it("returns 201 when adding comment", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "J", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      const res = await request(app)
        .post(`/api/service-requests/${req.id}/comments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "My comment here" })
        .expect(201);
      expect(res.body).toMatchObject({
        requestId: req.id,
        authorId: userId,
        body: "My comment here",
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("returns 400 when body is empty", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "K", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Draft",
        },
      });
      await request(app)
        .post(`/api/service-requests/${req.id}/comments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ body: "" })
        .expect(400);
    });
  });

  describe("Service request workflow (integration)", () => {
    it("approvalFlow none: Submitted → Approved on send-for-approval, then start and complete", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "No approval cat", approvalFlow: "none", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "Submitted",
          submittedAt: new Date(),
        },
      });

      const send = await request(app)
        .post(`/api/service-requests/${req.id}/send-for-approval`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(send.body.status).toBe("Approved");

      const start = await request(app)
        .post(`/api/service-requests/${req.id}/start`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(start.body.status).toBe("InProgress");

      const done = await request(app)
        .post(`/api/service-requests/${req.id}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(done.body.status).toBe("Completed");
      expect(done.body.completedAt).toBeTruthy();

      const detail = await request(app)
        .get(`/api/service-requests/${req.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(detail.body.workflowEvents.length).toBeGreaterThanOrEqual(3);
    });

    it("approvalFlow single: gestor approves; analista with approve perm gets 403 when not in approverRoleIds", async ({
      skip,
    }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: {
          name: "Manager-only approval",
          approvalFlow: "single",
          approverRoleIds: ["gestor"],
        },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "InApproval",
        },
      });

      const analistaToken = createTestJwt({
        sub: "33333333-3333-3333-3333-333333333333",
        email: "ana@test.com",
        role: "analista",
        perms: ["requests:approve:all", "requests:read:all"],
      });
      await request(app)
        .post(`/api/service-requests/${req.id}/approve`)
        .set("Authorization", `Bearer ${analistaToken}`)
        .expect(403);

      const gestorToken = createTestJwt({
        sub: "44444444-4444-4444-4444-444444444444",
        email: "gest@test.com",
        role: "gestor",
        perms: ["requests:approve:all"],
      });
      const ok = await request(app)
        .post(`/api/service-requests/${req.id}/approve`)
        .set("Authorization", `Bearer ${gestorToken}`)
        .expect(200);
      expect(ok.body.status).toBe("Approved");
    });

    it("reject stores reason on workflow trail", async ({ skip }) => {
      if (!dbAvailable) skip();
      const catalogItem = await container.prisma.serviceCatalogItemModel.create({
        data: { name: "Reject cat", approvalFlow: "single", approverRoleIds: [] },
      });
      const req = await container.prisma.serviceRequestModel.create({
        data: {
          catalogItemId: catalogItem.id,
          requesterId: userId,
          status: "InApproval",
        },
      });
      await request(app)
        .post(`/api/service-requests/${req.id}/reject`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reason: "  Falta documentação  " })
        .expect(200);

      const detail = await request(app)
        .get(`/api/service-requests/${req.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(detail.body.status).toBe("Rejected");
      const rejectEvt = detail.body.workflowEvents.find((e: { toStatus: string }) => e.toStatus === "Rejected");
      expect(rejectEvt?.reason).toBe("Falta documentação");
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "request-service");
    });
  });
});
