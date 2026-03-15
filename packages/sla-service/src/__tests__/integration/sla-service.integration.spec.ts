/**
 * Integration tests for the SLA Service API.
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
  process.env.SLA_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/sla_service";

describe("SLA Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
    rabbitmqUrl: undefined,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3006" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.slaPolicyModel.deleteMany({});
      await container.prisma.holidayModel.deleteMany({});
      await container.prisma.calendarModel.deleteMany({});
      await container.prisma.outboxModel.deleteMany({});
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
    await container.prisma.slaPolicyModel.deleteMany({});
    await container.prisma.holidayModel.deleteMany({});
    await container.prisma.calendarModel.deleteMany({});
    await container.prisma.outboxModel.deleteMany({});
  });

  describe("POST /api/calendars (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/calendars")
        .send({
          name: "Business Hours",
          workingDays: [1, 2, 3, 4, 5],
          workStartMinutes: 480,
          workEndMinutes: 1080,
        })
        .expect(401);
    });

    it("returns 201 when creating calendar", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/calendars")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Business Hours",
          workingDays: [1, 2, 3, 4, 5],
          workStartMinutes: 480,
          workEndMinutes: 1080,
        })
        .expect(201);
      expect(res.body).toMatchObject({
        name: "Business Hours",
        timezone: "UTC",
        workStartMinutes: 480,
        workEndMinutes: 1080,
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body.workingDays).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns 400 when validation fails (workEnd before workStart)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/calendars")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Bad",
          workingDays: [1],
          workStartMinutes: 1080,
          workEndMinutes: 480,
        })
        .expect(400);
    });
  });

  describe("GET /api/calendars (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/calendars").expect(401);
    });

    it("returns 200 with empty array when no calendars", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/calendars")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with calendars", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Cal 1",
          timezone: "UTC",
          workingDays: [1, 2, 3],
          workStartMinutes: 480,
          workEndMinutes: 1080,
        },
      });
      const res = await request(app)
        .get("/api/calendars")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(cal.id);
      expect(res.body[0].name).toBe("Cal 1");
    });
  });

  describe("GET /api/calendars/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/calendars/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when calendar does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/calendars/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Calendar not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with calendar", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Get Test Cal",
          timezone: "UTC",
          workingDays: [1, 2, 3, 4, 5],
          workStartMinutes: 480,
          workEndMinutes: 1080,
        },
      });
      const res = await request(app)
        .get(`/api/calendars/${cal.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: cal.id,
        name: "Get Test Cal",
      });
    });
  });

  describe("POST /api/sla-policies (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Cal",
          timezone: "UTC",
          workingDays: [1],
          workStartMinutes: 0,
          workEndMinutes: 1440,
        },
      });
      await request(app)
        .post("/api/sla-policies")
        .send({
          name: "Policy",
          ticketType: "incident",
          responseMinutes: 15,
          resolutionMinutes: 240,
          calendarId: cal.id,
        })
        .expect(401);
    });

    it("returns 201 when creating SLA policy", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Cal",
          timezone: "UTC",
          workingDays: [1, 2, 3, 4, 5],
          workStartMinutes: 480,
          workEndMinutes: 1080,
        },
      });
      const res = await request(app)
        .post("/api/sla-policies")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Incident Critical",
          ticketType: "incident",
          criticality: "Critical",
          responseMinutes: 15,
          resolutionMinutes: 240,
          calendarId: cal.id,
        })
        .expect(201);
      expect(res.body).toMatchObject({
        name: "Incident Critical",
        ticketType: "incident",
        criticality: "Critical",
        responseMinutes: 15,
        resolutionMinutes: 240,
        calendarId: cal.id,
        isActive: true,
      });
      expect(res.body).toHaveProperty("id");
    });

    it("returns 404 when calendar does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/sla-policies")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Policy",
          ticketType: "incident",
          responseMinutes: 60,
          resolutionMinutes: 480,
          calendarId: "00000000-0000-0000-0000-000000000000",
        })
        .expect(404);
      expect(res.body).toHaveProperty("error");
      const msg = res.body.message ?? res.body.error ?? "";
      expect(String(msg)).toContain("Calendar not found");
    });

    it("returns 400 when validation fails (missing name)", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Cal",
          timezone: "UTC",
          workingDays: [1],
          workStartMinutes: 0,
          workEndMinutes: 1440,
        },
      });
      await request(app)
        .post("/api/sla-policies")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketType: "incident",
          responseMinutes: 60,
          resolutionMinutes: 480,
          calendarId: cal.id,
        })
        .expect(400);
    });
  });

  describe("GET /api/sla-policies (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/sla-policies").expect(401);
    });

    it("returns 200 with empty array when no policies", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/sla-policies")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 400 when ticketType filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/sla-policies?ticketType=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/sla-policies/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/sla-policies/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when SLA policy does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/sla-policies/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "SLA policy not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with SLA policy", async ({ skip }) => {
      if (!dbAvailable) skip();
      const cal = await container.prisma.calendarModel.create({
        data: {
          name: "Cal",
          timezone: "UTC",
          workingDays: [1],
          workStartMinutes: 0,
          workEndMinutes: 1440,
        },
      });
      const policy = await container.prisma.slaPolicyModel.create({
        data: {
          name: "Get Test Policy",
          ticketType: "incident",
          criticality: "High",
          responseMinutes: 30,
          resolutionMinutes: 480,
          calendarId: cal.id,
          priority: 0,
          isActive: true,
        },
      });
      const res = await request(app)
        .get(`/api/sla-policies/${policy.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: policy.id,
        name: "Get Test Policy",
        ticketType: "incident",
        criticality: "High",
      });
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "sla-service");
    });
  });
});
