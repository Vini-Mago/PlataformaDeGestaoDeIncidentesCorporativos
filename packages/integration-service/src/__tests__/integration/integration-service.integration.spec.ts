import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createContainer } from "../../container";
import { createApp } from "../../app";

describe("integration-service HTTP", () => {
  const databaseUrl =
    process.env.INTEGRATION_DATABASE_URL ??
    "postgresql://pgic:pgic@localhost:5432/integration_service";

  const container = createContainer({
    databaseUrl,
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-min-32-chars-for-jwt-signing",
    webhookApiKey: "test-webhook-key",
    systemUserId: "00000000-0000-4000-8000-000000000001",
  });

  const app = createApp(container);

  afterAll(async () => {
    await container.disconnect();
  });

  it("GET /health retorna ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST webhook sem API key retorna 401", async () => {
    const res = await request(app)
      .post("/api/webhooks/v1/monitoring")
      .send({ externalId: "x", title: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST webhook válido retorna 202", async () => {
    const res = await request(app)
      .post("/api/webhooks/v1/monitoring")
      .set("X-API-Key", "test-webhook-key")
      .send({
        externalId: `alert-${Date.now()}`,
        title: "CPU alta",
        severity: "high",
      });
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(true);
  });
});
