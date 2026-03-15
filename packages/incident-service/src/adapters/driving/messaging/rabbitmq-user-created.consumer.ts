import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_USER_EVENTS,
  QUEUE_USER_CREATED_INCIDENT,
  ROUTING_KEY_USER_CREATED,
  USER_CREATED_EVENT,
} from "@pgic/shared";
import type { HandleUserCreatedUseCase } from "../../../application/use-cases/handle-user-created.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

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
    this.connection.on("error", (err) => {
      logger.error({ err }, "RabbitMQ user.created consumer: connection error");
    });
    this.connection.on("close", () => {
      this.connection = null;
      this.channel = null;
    });
    try {
      this.channel = await this.connection.createChannel();
      this.channel.on("error", (err) => {
        logger.error({ err }, "RabbitMQ user.created consumer: channel error");
      });
      this.channel.on("close", () => {
        this.channel = null;
      });
      await this.channel.assertExchange(EXCHANGE_USER_EVENTS, "topic", { durable: true });
      await this.channel.assertQueue(QUEUE_USER_CREATED_INCIDENT, { durable: true });
      await this.channel.bindQueue(
        QUEUE_USER_CREATED_INCIDENT,
        EXCHANGE_USER_EVENTS,
        ROUTING_KEY_USER_CREATED
      );

      const { consumerTag } = await this.channel.consume(
      QUEUE_USER_CREATED_INCIDENT,
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
          logger.error({ err }, "user.created consumer: handle failed, nack without requeue");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
      );
      this.consumerTag = consumerTag;
      logger.info({ queue: QUEUE_USER_CREATED_INCIDENT }, "RabbitMQ user.created consumer started");
    } catch (err) {
      logger.error({ err }, "RabbitMQ user.created consumer: setup failed");
      if (this.connection) {
        try {
          await this.connection.close();
        } catch {
          // ignore
        }
        this.connection = null;
        this.channel = null;
      }
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.consumerTag && this.channel) {
      try {
        await this.channel.cancel(this.consumerTag);
      } catch (err) {
        logger.warn({ err }, "RabbitMQ user.created consumer: cancel failed");
      } finally {
        this.consumerTag = null;
      }
    }
    if (this.channel) {
      try {
        await this.channel.close();
      } catch (err) {
        logger.warn({ err }, "RabbitMQ user.created consumer: channel close failed");
      } finally {
        this.channel = null;
      }
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (err) {
        logger.warn({ err }, "RabbitMQ user.created consumer: connection close failed");
      } finally {
        this.connection = null;
      }
    }
    logger.info("RabbitMQ user.created consumer stopped");
  }
}
