import path from "path";
import { config as loadEnv } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createContainer as createIncidentContainer } from "../../container";
import { createApp as createIncidentApp } from "../../app";
import { createContainer as createSlaContainer } from "../../../../sla-service/src/container";
import { createContainer as createEscalationContainer } from "../../../../escalation-service/src/container";
import { createTestJwt, TEST_JWT_SECRET } from "../integration/test-jwt";

const packageRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(packageRoot, "../..");
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

const incidentDatabaseUrl = process.env.INCIDENT_DATABASE_URL;
const slaDatabaseUrl = process.env.SLA_DATABASE_URL;
const escalationDatabaseUrl = process.env.ESCALATION_DATABASE_URL;
const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://pgic:pgic@localhost:5672";
const jwtSecret = TEST_JWT_SECRET;

const missingDatabaseEnv = [
  !incidentDatabaseUrl ? "INCIDENT_DATABASE_URL" : null,
  !slaDatabaseUrl ? "SLA_DATABASE_URL" : null,
  !escalationDatabaseUrl ? "ESCALATION_DATABASE_URL" : null,
].filter((name): name is string => Boolean(name));

describe("E2E SLA and Escalation Flow", () => {
  let incidentContainer: ReturnType<typeof createIncidentContainer> | undefined;
  let incidentApp: ReturnType<typeof createIncidentApp> | undefined;
  let slaContainer: ReturnType<typeof createSlaContainer> | undefined;
  let escalationContainer: ReturnType<typeof createEscalationContainer> | undefined;

  let dbAvailable = false;
  let incidentServer: any;

  let createdIncidentId: string | undefined;
  let createdCalendarId: string | undefined;
  let createdPolicyId: string | undefined;
  let createdRuleId: string | undefined;

  beforeAll(async () => {
    if (missingDatabaseEnv.length > 0) {
      console.warn(
        `E2E SLA Escalation Test: missing ${missingDatabaseEnv.join(", ")}. Load repo .env or export service database URLs.`
      );
      return;
    }

    incidentContainer = createIncidentContainer({
      databaseUrl: incidentDatabaseUrl!,
      jwtSecret,
      rabbitmqUrl,
    });
    incidentApp = createIncidentApp(incidentContainer, { baseUrl: "http://localhost:3004" });

    slaContainer = createSlaContainer({
      databaseUrl: slaDatabaseUrl!,
      jwtSecret,
      rabbitmqUrl,
    });

    escalationContainer = createEscalationContainer({
      databaseUrl: escalationDatabaseUrl!,
      jwtSecret,
      rabbitmqUrl,
    });

    try {
      await incidentContainer.prisma.$connect();
      await slaContainer.prisma.$connect();
      await escalationContainer.prisma.$connect();

      // Clean up databases before test run
      await slaContainer.prisma.slaAssignmentModel.deleteMany({});
      await slaContainer.prisma.slaPolicyModel.deleteMany({});
      await slaContainer.prisma.calendarModel.deleteMany({});
      await slaContainer.prisma.outboxModel.deleteMany({});
      await escalationContainer.prisma.escalationHistoryModel.deleteMany({});
      await escalationContainer.prisma.escalationRuleModel.deleteMany({});

      dbAvailable = true;

      // Start incident-service listening on port 3004 so that escalation-service can PATCH reassign it.
      incidentServer = incidentApp.listen(3004);
    } catch (err) {
      dbAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("E2E SLA Escalation Test: DB or RabbitMQ connection failure.", msg);
    }
  });

  afterAll(async () => {
    // DB cleanups after test run
    try {
      if (slaContainer && createdPolicyId) {
        await slaContainer.prisma.slaPolicyModel.deleteMany({ where: { id: createdPolicyId } });
      }
      if (slaContainer && createdCalendarId) {
        await slaContainer.prisma.calendarModel.deleteMany({ where: { id: createdCalendarId } });
      }
      if (escalationContainer && createdRuleId) {
        await escalationContainer.prisma.escalationRuleModel.deleteMany({ where: { id: createdRuleId } });
      }
      if (incidentContainer && createdIncidentId) {
        await incidentContainer.prisma.incidentModel.deleteMany({ where: { id: createdIncidentId } });
      }
    } catch (err) {
      console.warn("E2E SLA Escalation cleanups failed:", err);
    }

    if (incidentServer) {
      await new Promise<void>((resolve) => incidentServer.close(() => resolve()));
    }

    await incidentContainer?.disconnect();
    await slaContainer?.disconnect();
    await escalationContainer?.disconnect();
  });

  it("completes full sequence: Incident Created -> SLA creation -> SLA breach event -> Escalation rule reassigns ticket", async ({ skip }) => {
    if (!dbAvailable || !incidentContainer || !incidentApp || !slaContainer || !escalationContainer) {
      skip();
    }

    // 1. Setup SLA configuration: Create calendar and SLA policy
    const cal = await slaContainer.prisma.calendarModel.create({
      data: {
        name: "Standard Business Hours",
        timezone: "UTC",
        workingDays: [1, 2, 3, 4, 5],
        workStartMinutes: 480, // 08:00
        workEndMinutes: 1080,  // 18:00
      },
    });
    createdCalendarId = cal.id;

    const policy = await slaContainer.prisma.slaPolicyModel.create({
      data: {
        name: "Critical Incident SLA Policy",
        ticketType: "incident",
        criticality: "Critical",
        responseMinutes: 15,
        resolutionMinutes: 120,
        calendarId: cal.id,
        priority: 10,
        isActive: true,
      },
    });
    createdPolicyId = policy.id;

    // 2. Setup Escalation Rule matching SLA breach
    const rule = await escalationContainer.prisma.escalationRuleModel.create({
      data: {
        name: "Escalate Critical Incident Breaches",
        ticketType: "incident",
        conditionType: "sla_breach",
        conditionValue: "any",
        actions: ["reassign_level2"],
        priority: 1,
        isActive: true,
      },
    });
    createdRuleId = rule.id;

    // 3. Connect publishers and start consumers
    await incidentContainer.connectRabbitMQ();
    await slaContainer.connectRabbitMQ();

    if (slaContainer.incidentEventsConsumer) {
      await slaContainer.incidentEventsConsumer.start();
    }
    if (escalationContainer.escalationEventsConsumer) {
      await escalationContainer.escalationEventsConsumer.start();
    }

    // 4. Create a new Critical incident
    const requesterId = "22222222-2222-2222-2222-222222222222";
    const adminToken = createTestJwt({
      sub: requesterId,
      email: "admin@pgic.internal",
      role: "admin",
    });

    const createRes = await request(incidentApp)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Database Outage - Production",
        description: "PostgreSQL cluster is completely unresponsive.",
        criticality: "Critical",
        serviceAffected: "database",
      })
      .expect(201);

    const incidentId = createRes.body.id;
    createdIncidentId = incidentId;

    expect(createRes.body).toMatchObject({
      id: incidentId,
      criticality: "Critical",
      status: "Open",
    });

    // 5. Trigger incident outbox relay to publish incident.created event
    await incidentContainer.outboxRelay.runOnce();

    // 6. Wait for SLA service to consume the event and create SLA Assignment
    let assignment: any = null;
    for (let i = 0; i < 20; i++) {
      assignment = await slaContainer.prisma.slaAssignmentModel.findUnique({
        where: {
          ticketId_ticketType: {
            ticketId: incidentId,
            ticketType: "incident",
          },
        },
      });
      if (assignment) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(assignment).not.toBeNull();
    expect(assignment.policyId).toBe(policy.id);
    expect(assignment.status).toBe("active");

    // 7. Force an SLA breach by updating deadlines in SLA database to 5 minutes ago
    const pastDate = new Date(Date.now() - 5 * 60 * 1000);
    await slaContainer.prisma.slaAssignmentModel.update({
      where: { id: assignment.id },
      data: {
        responseDeadline: pastDate,
        resolutionDeadline: pastDate,
      },
    });

    // 8. Run SLA evaluations to detect breach and enqueue sla.breach outbox event
    // We access evaluateSlaAssignmentsUseCase directly from the container
    // @ts-ignore
    await slaContainer.evaluateSlaAssignmentsUseCase.execute();

    // 9. Run SLA outbox relay to publish the sla.breach event
    await slaContainer.outboxRelay.runOnce();

    // 10. Wait for escalation-service to consume sla.breach and trigger incident reassignment
    let finalIncident: any = null;
    for (let i = 0; i < 25; i++) {
      finalIncident = await incidentContainer.prisma.incidentModel.findUnique({
        where: { id: incidentId },
      });
      if (
        finalIncident &&
        finalIncident.assignedTeamId === "22222222-2222-2222-2222-222222222222" &&
        finalIncident.assignedToId === "33333333-3333-3333-3333-333333333333"
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    expect(finalIncident).not.toBeNull();
    expect(finalIncident.assignedTeamId).toBe("22222222-2222-2222-2222-222222222222");
    expect(finalIncident.assignedToId).toBe("33333333-3333-3333-3333-333333333333");

    // 11. Verify escalation history logs the action
    const escalationHistories = await escalationContainer.prisma.escalationHistoryModel.findMany({
      where: {
        ticketId: incidentId,
        ticketType: "incident",
      },
    });
    expect(escalationHistories.length).toBeGreaterThan(0);
    expect(escalationHistories[0].actionExecuted).toBe("reassign_level2");
  });
});
