/**
 * Integration tests for the Escalation Service API.
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
  process.env.ESCALATION_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/escalation_service";

describe("Escalation Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3007" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.escalationHistoryModel.deleteMany({});
      await container.prisma.escalationRuleModel.deleteMany({});
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
    await container.prisma.escalationHistoryModel.deleteMany({});
    await container.prisma.escalationRuleModel.deleteMany({});
  });

  describe("POST /api/escalation-rules (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/escalation-rules")
        .send({
          name: "No first response",
          ticketType: "incident",
          conditionType: "no_first_response_minutes",
          conditionValue: "15",
          actions: ["notify_manager"],
        })
        .expect(401);
    });

    it("returns 201 when creating escalation rule", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/escalation-rules")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "No first response 15min",
          description: "Escalate when no first response in 15 minutes",
          ticketType: "incident",
          conditionType: "no_first_response_minutes",
          conditionValue: "15",
          actions: ["notify_manager", "alert"],
        })
        .expect(201);
      expect(res.body).toMatchObject({
        name: "No first response 15min",
        description: "Escalate when no first response in 15 minutes",
        ticketType: "incident",
        conditionType: "no_first_response_minutes",
        conditionValue: "15",
        isActive: true,
      });
      expect(res.body.actions).toEqual(["notify_manager", "alert"]);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });

    it("returns 400 when validation fails (missing name)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/escalation-rules")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketType: "incident",
          conditionType: "no_first_response_minutes",
          conditionValue: "15",
          actions: ["notify_manager"],
        })
        .expect(400);
    });

    it("returns 400 when actions is empty", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/escalation-rules")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Rule",
          ticketType: "incident",
          conditionType: "no_first_response_minutes",
          conditionValue: "15",
          actions: [],
        })
        .expect(400);
    });
  });

  describe("GET /api/escalation-rules (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/escalation-rules").expect(401);
    });

    it("returns 200 with empty array when no rules", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/escalation-rules")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with rules when filtered by ticketType", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.escalationRuleModel.create({
        data: {
          name: "Incident rule",
          ticketType: "incident",
          conditionType: "criticality",
          conditionValue: "Critical",
          actions: ["notify_manager"],
          priority: 0,
          isActive: true,
        },
      });
      const res = await request(app)
        .get("/api/escalation-rules?ticketType=incident")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].ticketType).toBe("incident");
    });

    it("returns 400 when ticketType filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/escalation-rules?ticketType=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/escalation-rules/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/escalation-rules/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when rule does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/escalation-rules/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Escalation rule not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with rule", async ({ skip }) => {
      if (!dbAvailable) skip();
      const rule = await container.prisma.escalationRuleModel.create({
        data: {
          name: "Get Test Rule",
          ticketType: "request",
          conditionType: "sla_risk_percent",
          conditionValue: "80",
          actions: ["reassign_level2"],
          priority: 5,
          isActive: true,
        },
      });
      const res = await request(app)
        .get(`/api/escalation-rules/${rule.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: rule.id,
        name: "Get Test Rule",
        ticketType: "request",
        conditionType: "sla_risk_percent",
        conditionValue: "80",
      });
      expect(res.body.actions).toEqual(["reassign_level2"]);
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "escalation-service");
    });
  });
});
