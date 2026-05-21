import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_INCIDENT_EVENTS,
  INCIDENT_CREATED_EVENT,
  INCIDENT_STATUS_CHANGED_EVENT,
  QUEUE_INCIDENT_CREATED_SLA,
  QUEUE_INCIDENT_STATUS_CHANGED_SLA,
  ROUTING_KEY_INCIDENT_CREATED,
  ROUTING_KEY_INCIDENT_STATUS_CHANGED,
} from "@pgic/shared";
import type { HandleIncidentCreatedForSlaUseCase } from "../../../application/use-cases/handle-incident-created-for-sla.use-case";
import type { HandleIncidentStatusForSlaUseCase } from "../../../application/use-cases/handle-incident-status-for-sla.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqIncidentEventsConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private tags: string[] = [];

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleCreated: HandleIncidentCreatedForSlaUseCase,
    private readonly handleStatus: HandleIncidentStatusForSlaUseCase
  ) {}

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, { timeout: 10_000 });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_INCIDENT_EVENTS, "topic", { durable: true });

    await this.channel.assertQueue(QUEUE_INCIDENT_CREATED_SLA, { durable: true });
    await this.channel.bindQueue(
      QUEUE_INCIDENT_CREATED_SLA,
      EXCHANGE_INCIDENT_EVENTS,
      ROUTING_KEY_INCIDENT_CREATED
    );

    await this.channel.assertQueue(QUEUE_INCIDENT_STATUS_CHANGED_SLA, { durable: true });
    await this.channel.bindQueue(
      QUEUE_INCIDENT_STATUS_CHANGED_SLA,
      EXCHANGE_INCIDENT_EVENTS,
      ROUTING_KEY_INCIDENT_STATUS_CHANGED
    );

    const created = await this.channel.consume(
      QUEUE_INCIDENT_CREATED_SLA,
      async (msg) => {
        if (!msg) return;
        try {
          const envelope = JSON.parse(msg.content.toString()) as { type?: string; payload?: unknown };
          if (envelope.type === INCIDENT_CREATED_EVENT && envelope.payload) {
            await this.handleCreated.execute(envelope.payload as Parameters<HandleIncidentCreatedForSlaUseCase["execute"]>[0]);
          }
          this.channel?.ack(msg);
        } catch (err) {
          logger.error({ err }, "sla incident.created consumer failed");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    const status = await this.channel.consume(
      QUEUE_INCIDENT_STATUS_CHANGED_SLA,
      async (msg) => {
        if (!msg) return;
        try {
          const envelope = JSON.parse(msg.content.toString()) as { type?: string; payload?: unknown };
          if (envelope.type === INCIDENT_STATUS_CHANGED_EVENT && envelope.payload) {
            const p = envelope.payload as { incidentId: string; toStatus: string };
            await this.handleStatus.execute({
              incidentId: p.incidentId,
              toStatus: p.toStatus,
            });
          }
          this.channel?.ack(msg);
        } catch (err) {
          logger.error({ err }, "sla incident.status consumer failed");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    this.tags = [created.consumerTag, status.consumerTag];
    logger.info("sla-service: incident event consumers started");
  }

  async stop(): Promise<void> {
    if (this.channel) {
      for (const tag of this.tags) {
        await this.channel.cancel(tag);
      }
      this.tags = [];
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
