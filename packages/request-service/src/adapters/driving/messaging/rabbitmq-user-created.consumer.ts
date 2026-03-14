import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_USER_EVENTS,
  QUEUE_USER_CREATED_REQUEST,
  ROUTING_KEY_USER_CREATED,
  USER_CREATED_EVENT,
} from "@pgic/shared";
import type { HandleUserCreatedUseCase } from "../../../application/use-cases/handle-user-created.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

/**
 * Consumes user.created events from RabbitMQ (published by identity-service Outbox relay).
 * Asserts topic exchange and queue, binds by routing key, then runs HandleUserCreatedUseCase per message.
 */
export class RabbitMqUserCreatedConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleUserCreated: HandleUserCreatedUseCase
  ) {}

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqUserCreatedConsumer.CONNECT_TIMEOUT_MS,
    });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_USER_EVENTS, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_USER_CREATED_REQUEST, { durable: true });
    await this.channel.bindQueue(
      QUEUE_USER_CREATED_REQUEST,
      EXCHANGE_USER_EVENTS,
      ROUTING_KEY_USER_CREATED
    );

    const { consumerTag } = await this.channel.consume(
      QUEUE_USER_CREATED_REQUEST,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const raw = msg.content.toString();
          const envelope = JSON.parse(raw) as { type?: string; payload?: unknown };
          if (envelope.type !== USER_CREATED_EVENT || envelope.payload === undefined) {
            logger.warn({ type: envelope.type }, "user.created consumer: unexpected message type, nack without requeue");
            this.channel?.nack(msg, false, false);
            return;
          }
          const result = await this.handleUserCreated.execute(envelope.payload);
          if (result.ok) {
            this.channel?.ack(msg);
          } else {
            this.channel?.nack(msg, false, false);
          }
        } catch (err) {
          logger.error({ err, msg: msg.content?.toString() }, "user.created consumer: handle failed, nack without requeue");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    this.consumerTag = consumerTag;
    logger.info({ queue: QUEUE_USER_CREATED_REQUEST }, "RabbitMQ user.created consumer started");
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
    logger.info("RabbitMQ user.created consumer stopped");
  }
}
