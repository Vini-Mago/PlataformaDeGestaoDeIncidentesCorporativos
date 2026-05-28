import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_INCIDENT_EVENTS,
  EXCHANGE_REQUEST_EVENTS,
  EXCHANGE_PROBLEM_EVENTS,
  EXCHANGE_CHANGE_EVENTS,
  EXCHANGE_USER_EVENTS,
} from "@pgic/shared";
import type { CreateAuditEntryUseCase } from "../../../application/use-cases/create-audit-entry.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

// Default system UUID fallback for actions without a specific user
const SYSTEM_USER_ID = "00000000-0000-4000-8000-000000000001";

// Helper to validate UUID format
function isValidUuid(id: unknown): boolean {
  if (typeof id !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export class RabbitMqAuditEventsConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private tags: string[] = [];
  private readonly queueName = "audit.events_queue";

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly createAuditEntryUseCase: CreateAuditEntryUseCase
  ) {}

  private async handleMessage(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    try {
      const content = msg.content.toString();
      const envelope = JSON.parse(content) as { type?: string; payload?: Record<string, unknown> };

      if (!envelope || typeof envelope !== "object" || !envelope.type || !envelope.payload) {
        logger.warn({ envelope, content }, "Audit consumer: Invalid envelope structure. Dropping message.");
        this.channel?.nack(msg, false, false);
        return;
      }

      const eventType = envelope.type;
      const payload = envelope.payload;

      // 1. Identify resourceType and extract it
      let resourceType = "unknown";
      if (eventType.startsWith("incident.")) {
        resourceType = "incident";
      } else if (eventType.startsWith("request.")) {
        resourceType = "request";
      } else if (eventType.startsWith("problem.")) {
        resourceType = "problem";
      } else if (eventType.startsWith("change.")) {
        resourceType = "change";
      } else if (eventType.startsWith("user.")) {
        resourceType = "user";
      } else {
        resourceType = eventType.split(".")[0] || "unknown";
      }

      // 2. Extract resourceId
      let resourceId: string | undefined;
      if (payload.incidentId && typeof payload.incidentId === "string") {
        resourceId = payload.incidentId;
      } else if (payload.serviceRequestId && typeof payload.serviceRequestId === "string") {
        resourceId = payload.serviceRequestId;
      } else if (payload.problemId && typeof payload.problemId === "string") {
        resourceId = payload.problemId;
      } else if (payload.changeId && typeof payload.changeId === "string") {
        resourceId = payload.changeId;
      } else if (payload.userId && typeof payload.userId === "string") {
        resourceId = payload.userId;
      } else if (payload.id && typeof payload.id === "string") {
        resourceId = payload.id;
      }

      // Ensure resourceId is a valid UUID
      if (resourceId && !isValidUuid(resourceId)) {
        resourceId = undefined;
      }

      // 3. Extract userId (the actor/operator)
      let userId: string | undefined;
      if (payload.actorId && typeof payload.actorId === "string") {
        userId = payload.actorId;
      } else if (payload.changedById && typeof payload.changedById === "string") {
        userId = payload.changedById;
      } else if (payload.createdById && typeof payload.createdById === "string") {
        userId = payload.createdById;
      } else if (payload.requesterId && typeof payload.requesterId === "string") {
        userId = payload.requesterId;
      } else if (payload.userId && typeof payload.userId === "string") {
        userId = payload.userId;
      }

      // If no valid UUID is found for the actor, fallback to the system user ID
      if (!userId || !isValidUuid(userId)) {
        userId = SYSTEM_USER_ID;
      }

      // 4. Create the audit entry
      await this.createAuditEntryUseCase.execute({
        userId,
        action: eventType,
        resourceType,
        resourceId: resourceId || null,
        metadata: payload,
      });

      logger.info(
        { eventType, resourceType, resourceId, userId },
        "Audit consumer: Successfully persisted audit entry for event"
      );

      this.channel?.ack(msg);
    } catch (err) {
      logger.error({ err, msgContent: msg.content.toString() }, "Audit consumer: Processing failed");
      // Requeue is false to prevent infinite loop of poison pills
      this.channel?.nack(msg, false, false);
    }
  }

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, { timeout: 10_000 });
    this.channel = await this.connection.createChannel();

    // Assert the shared exchanges just in case they don't exist yet
    await this.channel.assertExchange(EXCHANGE_INCIDENT_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_REQUEST_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_PROBLEM_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_CHANGE_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_USER_EVENTS, "topic", { durable: true });

    // Assert and configure the audit queue
    await this.channel.assertQueue(this.queueName, { durable: true });

    // Bind queue to all exchanges to capture the transversal audit trail
    // Using wildcard "#" to consume all routing keys (all events) published on these exchanges
    await this.channel.bindQueue(this.queueName, EXCHANGE_INCIDENT_EVENTS, "#");
    await this.channel.bindQueue(this.queueName, EXCHANGE_REQUEST_EVENTS, "#");
    await this.channel.bindQueue(this.queueName, EXCHANGE_PROBLEM_EVENTS, "#");
    await this.channel.bindQueue(this.queueName, EXCHANGE_CHANGE_EVENTS, "#");
    await this.channel.bindQueue(this.queueName, EXCHANGE_USER_EVENTS, "#");

    const { consumerTag } = await this.channel.consume(
      this.queueName,
      (msg) => this.handleMessage(msg),
      { noAck: false }
    );

    this.tags.push(consumerTag);
    logger.info({ queue: this.queueName }, "audit-service: Transversal audit event consumers started");
  }

  async stop(): Promise<void> {
    if (this.channel) {
      for (const tag of this.tags) {
        await this.channel.cancel(tag).catch(() => {});
      }
      this.tags = [];
      await this.channel.close().catch(() => {});
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close().catch(() => {});
      this.connection = null;
    }
  }
}
