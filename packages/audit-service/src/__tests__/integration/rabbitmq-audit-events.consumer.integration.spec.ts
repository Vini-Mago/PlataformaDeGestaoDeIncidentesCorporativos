import path from "path";
import { config as loadEnv } from "dotenv";
const packageRoot = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(packageRoot, "../../../.env") });
loadEnv({ path: path.join(packageRoot, ".env"), override: true });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import amqp from "amqplib";
import { createContainer } from "../../container";
import type { AuditEntryModel } from "../../../generated/prisma-client";
import {
  EXCHANGE_INCIDENT_EVENTS,
  EXCHANGE_REQUEST_EVENTS,
  ROUTING_KEY_INCIDENT_CREATED,
  ROUTING_KEY_REQUEST_SUBMITTED,
} from "@pgic/shared";

const databaseUrl =
  process.env.AUDIT_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:55432/audit_service";
const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://pgic:pgic@localhost:55672";

describe("RabbitMqAuditEventsConsumer integration", () => {
  const container = createContainer({
    databaseUrl,
    jwtSecret: "test-secret-at-least-32-chars-for-audit",
    rabbitmqUrl,
  });

  let dbAvailable = false;
  let rmqAvailable = false;
  let rmqConn: amqp.Connection | null = null;
  let rmqChan: amqp.Channel | null = null;

  beforeAll(async () => {
    // Check DB
    try {
      await container.prisma.$connect();
      await container.prisma.auditEntryModel.deleteMany({});
      dbAvailable = true;
    } catch (err) {
      console.warn("DB unreachable:", err);
    }

    // Check RMQ
    try {
      rmqConn = await amqp.connect(rabbitmqUrl, { timeout: 3000 });
      rmqChan = await rmqConn.createChannel();
      rmqAvailable = true;
    } catch (err) {
      console.warn("RMQ unreachable:", err);
    }
  });

  afterAll(async () => {
    if (rmqChan) await rmqChan.close().catch(() => {});
    if (rmqConn) await rmqConn.close().catch(() => {});
    await container.disconnect();
  });

  beforeEach(async () => {
    if (dbAvailable) {
      await container.prisma.auditEntryModel.deleteMany({});
    }
  });

  it("consumes and persists incident.created event", async ({ skip }) => {
    if (!dbAvailable || !rmqAvailable) skip();

    const consumer = container.auditEventsConsumer;
    expect(consumer).not.toBeNull();

    // Start consumer
    await consumer!.start();

    // Publish test event
    const incidentId = "33333333-3333-3333-3333-333333333333";
    const requesterId = "22222222-2222-2222-2222-222222222222";
    const eventPayload = {
      type: "incident.created",
      payload: {
        incidentId,
        criticality: "Critical",
        requesterId,
        occurredAt: new Date().toISOString(),
        title: "Test Incident",
      },
    };

    // Ensure exchange is asserted
    await rmqChan!.assertExchange(EXCHANGE_INCIDENT_EVENTS, "topic", { durable: true });

    // Publish to RabbitMQ exchange
    rmqChan!.publish(
      EXCHANGE_INCIDENT_EVENTS,
      ROUTING_KEY_INCIDENT_CREATED,
      Buffer.from(JSON.stringify(eventPayload)),
      { persistent: true }
    );

    // Wait for consumer to process message
    let entry: AuditEntryModel | null = null;
    for (let i = 0; i < 20; i++) {
      entry = await container.prisma.auditEntryModel.findFirst({
        where: { resourceId: incidentId },
      });
      if (entry) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(entry).not.toBeNull();
    expect(entry.action).toBe("incident.created");
    expect(entry.resourceType).toBe("incident");
    expect(entry.userId).toBe(requesterId);
    expect(entry.metadata).toMatchObject({
      incidentId,
      criticality: "Critical",
      requesterId,
    });

    await consumer!.stop();
  });

  it("consumes and persists request.submitted event", async ({ skip }) => {
    if (!dbAvailable || !rmqAvailable) skip();

    const consumer = container.auditEventsConsumer;
    expect(consumer).not.toBeNull();

    // Start consumer
    await consumer!.start();

    // Publish request event
    const requestId = "44444444-4444-4444-4444-444444444444";
    const actorId = "55555555-5555-5555-5555-555555555555";
    const eventPayload = {
      type: "request.submitted",
      payload: {
        serviceRequestId: requestId,
        requesterId: "66666666-6666-6666-6666-666666666666",
        actorId,
        occurredAt: new Date().toISOString(),
      },
    };

    // Ensure exchange is asserted
    await rmqChan!.assertExchange(EXCHANGE_REQUEST_EVENTS, "topic", { durable: true });

    // Publish
    rmqChan!.publish(
      EXCHANGE_REQUEST_EVENTS,
      ROUTING_KEY_REQUEST_SUBMITTED,
      Buffer.from(JSON.stringify(eventPayload)),
      { persistent: true }
    );

    // Wait
    let entry: AuditEntryModel | null = null;
    for (let i = 0; i < 20; i++) {
      entry = await container.prisma.auditEntryModel.findFirst({
        where: { resourceId: requestId },
      });
      if (entry) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(entry).not.toBeNull();
    expect(entry.action).toBe("request.submitted");
    expect(entry.resourceType).toBe("request");
    expect(entry.userId).toBe(actorId);

    await consumer!.stop();
  });
});
