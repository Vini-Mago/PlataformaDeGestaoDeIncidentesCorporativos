import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_INTEGRATION_EVENTS,
  INTEGRATION_INCIDENT_INGEST_EVENT,
  QUEUE_INCIDENT_INTEGRATION_INGEST,
  ROUTING_KEY_INCIDENT_INGEST,
} from "@pgic/shared";
import type {
  HandleIntegrationIncidentIngestUseCase,
  IntegrationIncidentIngestPayload,
} from "../../../application/use-cases/handle-integration-incident-ingest.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqIntegrationIngestConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleIngest: HandleIntegrationIncidentIngestUseCase
  ) {}

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, { timeout: 10_000 });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_INTEGRATION_EVENTS, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_INCIDENT_INTEGRATION_INGEST, { durable: true });
    await this.channel.bindQueue(
      QUEUE_INCIDENT_INTEGRATION_INGEST,
      EXCHANGE_INTEGRATION_EVENTS,
      ROUTING_KEY_INCIDENT_INGEST
    );

    const { consumerTag } = await this.channel.consume(
      QUEUE_INCIDENT_INTEGRATION_INGEST,
      async (msg) => {
        if (!msg) return;
        try {
          const envelope = JSON.parse(msg.content.toString()) as {
            type?: string;
            payload?: IntegrationIncidentIngestPayload;
          };
          if (envelope.type !== INTEGRATION_INCIDENT_INGEST_EVENT || !envelope.payload) {
            this.channel?.nack(msg, false, false);
            return;
          }
          await this.handleIngest.execute(envelope.payload);
          this.channel?.ack(msg);
        } catch (err) {
          logger.error({ err }, "integration ingest consumer failed");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    this.consumerTag = consumerTag;
    logger.info({ queue: QUEUE_INCIDENT_INTEGRATION_INGEST }, "integration ingest consumer started");
  }

  async stop(): Promise<void> {
    if (this.consumerTag && this.channel) {
      await this.channel.cancel(this.consumerTag);
      this.consumerTag = null;
    }
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
