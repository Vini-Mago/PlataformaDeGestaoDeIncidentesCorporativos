import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_REQUEST_EVENTS,
  QUEUE_REQUEST_EVENTS_NOTIFICATION,
  ROUTING_KEY_REQUEST_APPROVED,
  ROUTING_KEY_REQUEST_COMPLETED,
  ROUTING_KEY_REQUEST_CREATED,
  ROUTING_KEY_REQUEST_IN_APPROVAL,
  ROUTING_KEY_REQUEST_REJECTED,
  ROUTING_KEY_REQUEST_STARTED,
  ROUTING_KEY_REQUEST_SUBMITTED,
  requestDomainEventEnvelopeSchema,
} from "@pgic/shared";
import type { HandleRequestDomainEventUseCase } from "../../../application/use-cases/handle-request-domain-event.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

const REQUEST_ROUTING_KEYS = [
  ROUTING_KEY_REQUEST_CREATED,
  ROUTING_KEY_REQUEST_SUBMITTED,
  ROUTING_KEY_REQUEST_IN_APPROVAL,
  ROUTING_KEY_REQUEST_APPROVED,
  ROUTING_KEY_REQUEST_REJECTED,
  ROUTING_KEY_REQUEST_STARTED,
  ROUTING_KEY_REQUEST_COMPLETED,
] as const;

/**
 * Consome eventos de domínio do request-service (`request.events`, topic).
 * Cria notificação in-app para o solicitante (`requesterId` no payload).
 */
export class RabbitMqRequestEventsConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleRequestDomainEvent: HandleRequestDomainEventUseCase
  ) {}

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqRequestEventsConsumer.CONNECT_TIMEOUT_MS,
    });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_REQUEST_EVENTS, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_REQUEST_EVENTS_NOTIFICATION, { durable: true });
    for (const key of REQUEST_ROUTING_KEYS) {
      await this.channel.bindQueue(QUEUE_REQUEST_EVENTS_NOTIFICATION, EXCHANGE_REQUEST_EVENTS, key);
    }

    const { consumerTag } = await this.channel.consume(
      QUEUE_REQUEST_EVENTS_NOTIFICATION,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const raw = msg.content.toString();
          const parsedEnvelope = requestDomainEventEnvelopeSchema.safeParse(JSON.parse(raw));
          if (!parsedEnvelope.success) {
            logger.warn(
              { issues: parsedEnvelope.error.issues },
              "request.events consumer: invalid envelope/payload, nack without requeue"
            );
            this.channel?.nack(msg, false, false);
            return;
          }
          const envelope = parsedEnvelope.data;
          const eventType = envelope.type;
          if (!this.handleRequestDomainEvent.handlesEventType(eventType)) {
            logger.warn({ type: eventType }, "request.events consumer: unsupported event type, nack without requeue");
            this.channel?.nack(msg, false, false);
            return;
          }
          const result = await this.handleRequestDomainEvent.execute(eventType, envelope.payload);
          if (result.ok) {
            this.channel?.ack(msg);
          } else {
            this.channel?.nack(msg, false, false);
          }
        } catch (err) {
          logger.error({ err, msg: msg.content?.toString() }, "request.events consumer: handle failed, nack without requeue");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    this.consumerTag = consumerTag;
    logger.info({ queue: QUEUE_REQUEST_EVENTS_NOTIFICATION }, "RabbitMQ request.events consumer started");
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
    logger.info("RabbitMQ request.events consumer stopped");
  }
}
