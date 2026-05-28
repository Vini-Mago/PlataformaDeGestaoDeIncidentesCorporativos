import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createContainer } from "../../container";
import { createApp } from "../../app";

describe("integration-service HTTP", () => {
  const jwtSecret = "integration-test-secret-minimum-32-characters";
const databaseUrl =
  process.env.INTEGRATION_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:55432/integration_service";

  const container = createContainer({
    databaseUrl,
    jwtSecret,
    webhookApiKey: "test-webhook-key",
    systemUserId: "00000000-0000-4000-8000-000000000001",
  });

  const app = createApp(container);
  const blockedIpContainer = createContainer({
    databaseUrl,
    jwtSecret,
    webhookApiKey: "test-webhook-key",
    webhookAllowedIps: ["203.0.113.10"],
    systemUserId: "00000000-0000-4000-8000-000000000001",
  });
  const blockedIpApp = createApp(blockedIpContainer);
  let dbAvailable = false;
  const authToken = jwt.sign(
    {
      sub: "11111111-1111-4111-8111-111111111111",
      email: "admin@test.com",
      role: "admin",
    },
    jwtSecret,
    { algorithm: "HS256", expiresIn: "1h" }
  );

  beforeAll(async () => {
    try {
      await container.prisma.$connect();
      await container.prisma.outboxModel.deleteMany({});
      await container.prisma.integrationDlqModel.deleteMany({});
      await container.prisma.integrationLogModel.deleteMany({});
      dbAvailable = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Integration tests: PostgreSQL unreachable.", msg);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await container.prisma.outboxModel.deleteMany({});
      await container.prisma.integrationDlqModel.deleteMany({});
      await container.prisma.integrationLogModel.deleteMany({});
    }
    await container.disconnect();
    await blockedIpContainer.disconnect();
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

  it("POST webhook bloqueia origem fora da allowlist de IP", async () => {
    const res = await request(blockedIpApp)
      .post("/api/webhooks/v1/monitoring")
      .set("X-API-Key", "test-webhook-key")
      .send({ externalId: "x", title: "Test" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Webhook source IP is not allowed");
  });

  it("POST webhook válido retorna 202", async ({ skip }) => {
    if (!dbAvailable) skip();
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

  it("GET integration logs retorna metadados de observabilidade", async ({ skip }) => {
    if (!dbAvailable) skip();
    await container.prisma.integrationLogModel.create({
      data: {
        direction: "outbound",
        endpoint: "https://erp.example.test/incidents",
        httpStatus: 504,
        correlationId: "corr-1",
        externalId: "erp-1",
        payloadSummary: { ticket: "INC-1", token: "[redacted]" },
        errorMessage: "Timeout",
        durationMs: 5_000,
      },
    });

    const res = await request(app)
      .get("/api/integration-logs")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.items[0]).toMatchObject({
      direction: "outbound",
      endpoint: "https://erp.example.test/incidents",
      httpStatus: 504,
      correlationId: "corr-1",
      externalId: "erp-1",
      payloadSummary: { ticket: "INC-1", token: "[redacted]" },
      errorMessage: "Timeout",
      durationMs: 5000,
    });
  });

  it("POST outbound/v1/deliver enfileira entrega assíncrona", async ({ skip }) => {
    if (!dbAvailable) skip();
    const res = await request(app)
      .post("/api/outbound/v1/deliver")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Correlation-Id", "corr-outbound-1")
      .send({
        endpoint: "https://erp.example.test/incidents",
        method: "POST",
        payload: { incidentId: "INC-1" },
        externalId: "erp-INC-1",
        timeoutMs: 2000,
        maxAttempts: 2,
      })
      .expect(202);

    expect(res.body).toMatchObject({
      accepted: true,
      endpoint: "https://erp.example.test/incidents",
      eventName: "integration.outbound_dispatch",
    });

    const outbox = await container.prisma.outboxModel.findFirst({
      where: { eventName: "integration.outbound_dispatch" },
      orderBy: { createdAt: "desc" },
    });
    expect(outbox).not.toBeNull();
  });

  it("lista e reprocessa itens da DLQ de integração", async ({ skip }) => {
    if (!dbAvailable) skip();
    const dlq = await container.prisma.integrationDlqModel.create({
      data: {
        eventName: "integration.incident_ingest",
        payload: {
          externalId: "dlq-alert-1",
          title: "Alerta em DLQ",
        },
        errorMessage: "Consumer failed",
      },
    });

    const listBefore = await request(app)
      .get("/api/integration-dlq?status=pending")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);
    expect(listBefore.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: dlq.id,
          eventName: "integration.incident_ingest",
          reprocessedAt: null,
        }),
      ])
    );

    const reprocess = await request(app)
      .post(`/api/integration-dlq/${dlq.id}/reprocess`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(202);
    expect(reprocess.body).toMatchObject({
      id: dlq.id,
      eventName: "integration.incident_ingest",
    });

    const updated = await container.prisma.integrationDlqModel.findUniqueOrThrow({
      where: { id: dlq.id },
    });
    expect(updated.reprocessedAt).toBeInstanceOf(Date);

    const outbox = await container.prisma.outboxModel.findFirst({
      where: { eventName: "integration.incident_ingest" },
      orderBy: { createdAt: "desc" },
    });
    expect(outbox?.payload).toMatchObject({
      externalId: "dlq-alert-1",
      title: "Alerta em DLQ",
      reprocessedFromDlqId: dlq.id,
    });

    await request(app)
      .post(`/api/integration-dlq/${dlq.id}/reprocess`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(409);
  });
});
