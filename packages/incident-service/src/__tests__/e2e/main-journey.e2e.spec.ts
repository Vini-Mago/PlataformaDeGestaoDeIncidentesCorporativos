import path from "path";
import { config as loadEnv } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createContainer as createIdentityContainer } from "../../../../identity-service/src/container";
import { createApp as createIdentityApp } from "../../../../identity-service/src/app";
import { createNoOpEventPublisher } from "../../../../identity-service/src/__tests__/integration/test-event-publisher";
import { createNoOpCache } from "../../../../identity-service/src/__tests__/integration/test-cache";
import { createContainer as createIncidentContainer } from "../../container";
import { createApp as createIncidentApp } from "../../app";

const packageRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(packageRoot, "../..");
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

const identityDatabaseUrl = process.env.IDENTITY_DATABASE_URL;
const incidentDatabaseUrl = process.env.INCIDENT_DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://pgic:pgic@localhost:5672";
const jwtSecret = process.env.JWT_SECRET ?? "integration-test-secret-min-32-chars-for-jwt";
const missingDatabaseEnv = [
  !identityDatabaseUrl ? "IDENTITY_DATABASE_URL" : null,
  !incidentDatabaseUrl ? "INCIDENT_DATABASE_URL" : null,
].filter((name): name is string => Boolean(name));

describe("E2E jornada principal (identity -> incident)", () => {
  let identityContainer: ReturnType<typeof createIdentityContainer> | undefined;
  let identityApp: ReturnType<typeof createIdentityApp> | undefined;
  let incidentContainer: ReturnType<typeof createIncidentContainer> | undefined;
  let incidentApp: ReturnType<typeof createIncidentApp> | undefined;
  let dbAvailable = false;
  let createdIncidentId: string | undefined;
  let createdUserId: string | undefined;

  beforeAll(async () => {
    if (missingDatabaseEnv.length > 0) {
      console.warn(
        `E2E tests: missing ${missingDatabaseEnv.join(", ")}. Load repo .env or export service database URLs.`
      );
      return;
    }

    identityContainer = createIdentityContainer({
      databaseUrl: identityDatabaseUrl,
      redisUrl,
      rabbitmqUrl,
      jwtSecret,
      jwtExpiresInSeconds: 3600,
      baseUrl: "http://localhost:3001",
      passwordAuthEnabled: true,
      eventPublisherOverride: createNoOpEventPublisher(),
      cacheOverride: createNoOpCache(),
    });
    identityApp = createIdentityApp(identityContainer);

    incidentContainer = createIncidentContainer({
      databaseUrl: incidentDatabaseUrl,
      jwtSecret,
      rabbitmqUrl: undefined,
    });
    incidentApp = createIncidentApp(incidentContainer, { baseUrl: "http://localhost:3004" });

    try {
      await identityContainer.prisma.$connect();
      await incidentContainer.prisma.$connect();
      dbAvailable = true;
    } catch (err) {
      dbAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("E2E tests: PostgreSQL unreachable.", msg);
    }
  });

  afterAll(async () => {
    if (incidentContainer && createdIncidentId) {
      await incidentContainer.prisma.incidentModel.deleteMany({
        where: { id: createdIncidentId },
      });
    }
    if (identityContainer && createdUserId) {
      await identityContainer.prisma.userModel.deleteMany({
        where: { id: createdUserId },
      });
    }
    await identityContainer?.disconnect();
    await incidentContainer?.disconnect();
  });

  it("executa login, cria incidente, atribui, evolui status e valida historico visivel", async ({ skip }) => {
    if (!dbAvailable || !identityContainer || !identityApp || !incidentContainer || !incidentApp) {
      skip();
    }

    const email = `e2e-main-${Date.now()}@example.com`;
    const password = "SecurePass123";
    const registerRes = await request(identityApp)
      .post("/api/auth/register")
      .send({
        email,
        name: "E2E Main User",
        password,
      })
      .expect(201);

    const userId = String(registerRes.body.user.id);
    createdUserId = userId;
    await identityContainer.prisma.userModel.update({
      where: { id: userId },
      data: { role: "admin" },
    });

    const loginRes = await request(identityApp)
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);
    const accessToken = String(loginRes.body.accessToken);

    const createdIncident = await request(incidentApp)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "E2E jornada principal",
        description: "Validar fluxo completo de incidente",
        criticality: "High",
        serviceAffected: "api-gateway",
      })
      .expect(201);
    const incidentId = String(createdIncident.body.id);
    createdIncidentId = incidentId;
    expect(createdIncident.body).toMatchObject({
      id: incidentId,
      title: "E2E jornada principal",
      requesterId: userId,
      status: "Open",
      source: "manual",
    });

    const assignedIncident = await request(incidentApp)
      .patch(`/api/incidents/${incidentId}/assign`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ assignedToId: userId })
      .expect(200);
    expect(assignedIncident.body).toMatchObject({
      id: incidentId,
      assignedToId: userId,
      status: "Open",
    });

    const incidentInAnalysis = await request(incidentApp)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ toStatus: "InAnalysis", comment: "Iniciando analise" })
      .expect(200);
    expect(incidentInAnalysis.body).toMatchObject({
      id: incidentId,
      status: "InAnalysis",
    });

    const resolvedIncident = await request(incidentApp)
      .patch(`/api/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ toStatus: "Resolved", comment: "Aplicada mitigacao" })
      .expect(200);
    expect(resolvedIncident.body).toMatchObject({
      id: incidentId,
      status: "Resolved",
      resolvedAt: expect.any(String),
    });

    const completionComment = await request(incidentApp)
      .post(`/api/incidents/${incidentId}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ body: "Incidente concluido e comunicado ao solicitante." })
      .expect(201);
    expect(completionComment.body).toMatchObject({
      incidentId,
      authorId: userId,
      body: "Incidente concluido e comunicado ao solicitante.",
    });

    const finalIncident = await request(incidentApp)
      .get(`/api/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(finalIncident.body).toMatchObject({
      id: incidentId,
      requesterId: userId,
      assignedToId: userId,
      status: "Resolved",
    });
    expect(Array.isArray(finalIncident.body.comments)).toBe(true);
    expect(finalIncident.body.comments.length).toBeGreaterThan(0);
    expect(finalIncident.body.comments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          incidentId,
          authorId: userId,
          body: "Incidente concluido e comunicado ao solicitante.",
        }),
      ])
    );
    expect(Array.isArray(finalIncident.body.statusHistory)).toBe(true);
    expect(finalIncident.body.statusHistory).toEqual([
      expect.objectContaining({
        incidentId,
        fromStatus: "Open",
        toStatus: "InAnalysis",
        changedById: userId,
        comment: "Iniciando analise",
      }),
      expect.objectContaining({
        incidentId,
        fromStatus: "InAnalysis",
        toStatus: "Resolved",
        changedById: userId,
        comment: "Aplicada mitigacao",
      }),
    ]);

    const historyRows = await incidentContainer.prisma.incidentStatusHistoryModel.findMany({
      where: { incidentId },
      orderBy: { createdAt: "asc" },
    });
    expect(historyRows.map((row) => row.toStatus)).toEqual(["InAnalysis", "Resolved"]);
  });
});
