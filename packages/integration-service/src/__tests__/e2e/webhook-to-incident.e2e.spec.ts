/**
 * E2E in-process: webhook → outbox → ingest → incidente (sem RabbitMQ).
 * Requer Postgres com migrations de integration_service e incident_service aplicadas.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient as IntegrationPrisma } from "../../../generated/prisma-client/index";
import { PrismaClient as IncidentPrisma } from "../../../../incident-service/generated/prisma-client/index";
import { PrismaIntegrationLogRepository, PrismaOutboxWriter } from "../../adapters/driven/persistence/prisma-integration-log.repository";
import { ProcessMonitoringWebhookUseCase } from "../../application/use-cases/process-monitoring-webhook.use-case";
import { PrismaIncidentRepository } from "../../../../incident-service/src/adapters/driven/persistence/prisma-incident.repository";
import { HandleIntegrationIncidentIngestUseCase } from "../../../../incident-service/src/application/use-cases/handle-integration-incident-ingest.use-case";
import { INTEGRATION_INCIDENT_INGEST_EVENT } from "@pgic/shared";

const integrationDbUrl =
  process.env.INTEGRATION_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/integration_service";
const incidentDbUrl =
  process.env.INCIDENT_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:5432/incident_service";
const systemUserId =
  process.env.INTEGRATION_SYSTEM_USER_ID ?? "00000000-0000-4000-8000-000000000001";

describe("E2E webhook → incidente", () => {
  const integrationPrisma = new IntegrationPrisma({
    datasources: { db: { url: integrationDbUrl } },
  });
  const incidentPrisma = new IncidentPrisma({
    datasources: { db: { url: incidentDbUrl } },
  });

  const externalId = `e2e-${Date.now()}`;
  const externalSource = "monitoring";

  beforeAll(async () => {
    await integrationPrisma.$connect();
    await incidentPrisma.$connect();
  });

  afterAll(async () => {
    await incidentPrisma.incidentModel.deleteMany({
      where: { externalSource, externalId },
    });
    await integrationPrisma.integrationLogModel.deleteMany({
      where: { externalId },
    });
    await integrationPrisma.outboxModel.deleteMany({
      where: { eventName: INTEGRATION_INCIDENT_INGEST_EVENT },
    });
    await integrationPrisma.$disconnect();
    await incidentPrisma.$disconnect();
  });

  it("cria incidente idempotente a partir do webhook", async () => {
    const logRepo = new PrismaIntegrationLogRepository(integrationPrisma);
    const outboxWriter = new PrismaOutboxWriter(integrationPrisma);
    const processWebhook = new ProcessMonitoringWebhookUseCase(logRepo, outboxWriter);

    const accepted = await processWebhook.execute({
      body: {
        externalId,
        title: "E2E alerta",
        severity: "high",
        serviceAffected: "api",
      },
      systemUserId,
    });
    expect(accepted.accepted).toBe(true);

    const outboxRow = await integrationPrisma.outboxModel.findFirst({
      where: { eventName: INTEGRATION_INCIDENT_INGEST_EVENT },
      orderBy: { createdAt: "desc" },
    });
    expect(outboxRow).not.toBeNull();

    const payload = outboxRow!.payload as Record<string, unknown>;
    const incidentRepo = new PrismaIncidentRepository(incidentPrisma);
    const ingest = new HandleIntegrationIncidentIngestUseCase(incidentRepo);

    const first = await ingest.execute({
      externalId: String(payload.externalId),
      externalSource: String(payload.externalSource),
      title: String(payload.title),
      description: String(payload.description),
      criticality: String(payload.criticality),
      serviceAffected: (payload.serviceAffected as string) ?? null,
      requesterId: String(payload.requesterId),
    });
    expect(first.created).toBe(true);
    expect(first.incident.source).toBe("integration");

    const second = await ingest.execute({
      externalId: String(payload.externalId),
      externalSource: String(payload.externalSource),
      title: String(payload.title),
      description: String(payload.description),
      criticality: String(payload.criticality),
      serviceAffected: null,
      requesterId: String(payload.requesterId),
    });
    expect(second.created).toBe(false);
    expect(second.incident.id).toBe(first.incident.id);
  });
});
