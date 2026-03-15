/**
 * Integration tests for the Reporting Service API.
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
  process.env.REPORTING_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/reporting_service";

describe("Reporting Service API integration", () => {
  const config = {
    databaseUrl,
    jwtSecret: TEST_JWT_SECRET,
  };

  const container = createContainer(config);
  const app = createApp(container, { baseUrl: "http://localhost:3010" });

  let dbAvailable = false;
  const userId = "11111111-1111-1111-1111-111111111111";
  const authToken = createTestJwt({ sub: userId, email: "user@test.com", role: "user" });

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.reportDefinitionModel.deleteMany({});
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
    await container.prisma.reportDefinitionModel.deleteMany({});
  });

  describe("POST /api/report-definitions (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/report-definitions")
        .send({
          name: "Incidents summary",
          reportType: "incidents_summary",
        })
        .expect(401);
    });

    it("returns 201 when creating report definition", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .post("/api/report-definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Monthly incidents",
          description: "Incidents by month",
          reportType: "incidents_summary",
          filters: { period: "month" },
        })
        .expect(201);
      expect(res.body).toMatchObject({
        name: "Monthly incidents",
        description: "Incidents by month",
        reportType: "incidents_summary",
      });
      expect(res.body.filters).toEqual({ period: "month" });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });

    it("returns 400 when validation fails (missing name)", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/report-definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportType: "incidents_summary",
        })
        .expect(400);
    });

    it("returns 400 when reportType is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .post("/api/report-definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Report",
          reportType: "invalid_type",
        })
        .expect(400);
    });
  });

  describe("GET /api/report-definitions (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app).get("/api/report-definitions").expect(401);
    });

    it("returns 200 with empty array when no reports", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/report-definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it("returns 200 with reports when filtered by reportType", async ({ skip }) => {
      if (!dbAvailable) skip();
      await container.prisma.reportDefinitionModel.create({
        data: {
          name: "KPI report",
          reportType: "kpi_dashboard",
          filters: {},
        },
      });
      const res = await request(app)
        .get("/api/report-definitions?reportType=kpi_dashboard")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].reportType).toBe("kpi_dashboard");
    });

    it("returns 400 when reportType filter is invalid", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/report-definitions?reportType=invalid")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/report-definitions/:id (auth required)", () => {
    it("returns 401 when Authorization is missing", async ({ skip }) => {
      if (!dbAvailable) skip();
      await request(app)
        .get("/api/report-definitions/11111111-1111-1111-1111-111111111111")
        .expect(401);
    });

    it("returns 404 when report does not exist", async ({ skip }) => {
      if (!dbAvailable) skip();
      const res = await request(app)
        .get("/api/report-definitions/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
      expect(res.body).toHaveProperty(
        "error",
        "Report definition not found: 00000000-0000-0000-0000-000000000000"
      );
    });

    it("returns 200 with report", async ({ skip }) => {
      if (!dbAvailable) skip();
      const report = await container.prisma.reportDefinitionModel.create({
        data: {
          name: "Get Test Report",
          reportType: "sla_compliance",
          filters: { team: "support" },
        },
      });
      const res = await request(app)
        .get(`/api/report-definitions/${report.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: report.id,
        name: "Get Test Report",
        reportType: "sla_compliance",
      });
      expect(res.body.filters).toEqual({ team: "support" });
    });
  });

  describe("GET /health", () => {
    it("returns 200 with service name", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toHaveProperty("service", "reporting-service");
    });
  });
});
