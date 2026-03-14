import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_USER_EVENTS,
  QUEUE_USER_UPDATED_REQUEST,
  ROUTING_KEY_USER_UPDATED,
  USER_UPDATED_EVENT,
} from "@pgic/shared";
import type { HandleUserCreatedUseCase } from "../../../application/use-cases/handle-user-created.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

/**
 * Consumes user.updated events from RabbitMQ (published by identity-service when user data changes).
 * Uses the same upsert logic as HandleUserCreatedUseCase; replicated_users stays in sync.
 */
export class RabbitMqUserUpdatedConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  private static readonly CONNECT_TIMEOUT_MS = 10_000;
  private static readonly RECONNECT_DELAY_MS = 5_000;

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleReplicateUser: HandleUserCreatedUseCase
  ) {}

  private onConnectionError = (err: Error): void => {
    logger.error({ err }, "user.updated consumer: connection error");
    this.scheduleReconnect();
  };

  private onConnectionClose = (): void => {
    if (this.stopped) return;
    logger.warn("user.updated consumer: connection closed");
    this.channel = null;
    this.consumerTag = null;
    this.connection = null;
    this.scheduleReconnect();
  };

  private onChannelError = (err: Error): void => {
    logger.error({ err }, "user.updated consumer: channel error");
  };

  private onChannelClose = (): void => {
    if (this.stopped) return;
    logger.warn("user.updated consumer: channel closed");
    this.channel = null;
    this.consumerTag = null;
  };

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId != null || this.stopped) return;
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.stopped) return;
      logger.info("user.updated consumer: attempting reconnect");
      this.start().catch((err) => {
        logger.error({ err }, "user.updated consumer: reconnect failed");
        this.scheduleReconnect();
      });
    }, RabbitMqUserUpdatedConsumer.RECONNECT_DELAY_MS);
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqUserUpdatedConsumer.CONNECT_TIMEOUT_MS,
    });
    this.connection.on("error", this.onConnectionError);
    this.connection.on("close", this.onConnectionClose);

    this.channel = await this.connection.createChannel();
    this.channel.on("error", this.onChannelError);
    this.channel.on("close", this.onChannelClose);

    await this.channel.assertExchange(EXCHANGE_USER_EVENTS, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_USER_UPDATED_REQUEST, { durable: true });
    await this.channel.bindQueue(
      QUEUE_USER_UPDATED_REQUEST,
      EXCHANGE_USER_EVENTS,
      ROUTING_KEY_USER_UPDATED
    );

    const { consumerTag } = await this.channel.consume(
      QUEUE_USER_UPDATED_REQUEST,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const raw = msg.content.toString();
          const envelope = JSON.parse(raw) as { type?: string; payload?: unknown };
          if (envelope.type !== USER_UPDATED_EVENT || envelope.payload === undefined) {
            logger.warn(
              { type: envelope.type },
              "user.updated consumer: unexpected message type, nack without requeue"
            );
            this.channel?.nack(msg, false, false);
            return;
          }
          const result = await this.handleReplicateUser.execute(envelope.payload);
          if (result.ok) {
            this.channel?.ack(msg);
          } else {
            const ctx = envelope.payload && typeof envelope.payload === "object" && "userId" in envelope.payload
              ? { userId: (envelope.payload as { userId?: unknown }).userId }
              : {};
            logger.warn(
              { ...ctx, reason: result.reason },
              "user.updated consumer: handle returned ok=false, nack without requeue"
            );
            this.channel?.nack(msg, false, false);
          }
        } catch (err) {
          logger.error(
            { err, msg: msg.content?.toString() },
            "user.updated consumer: handle failed, nack without requeue"
          );
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    this.consumerTag = consumerTag;
    logger.info({ queue: QUEUE_USER_UPDATED_REQUEST }, "RabbitMQ user.updated consumer started");
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimeoutId != null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.connection) {
      this.connection.removeListener("error", this.onConnectionError);
      this.connection.removeListener("close", this.onConnectionClose);
    }
    if (this.channel) {
      this.channel.removeListener("error", this.onChannelError);
      this.channel.removeListener("close", this.onChannelClose);
    }
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
    logger.info("RabbitMQ user.updated consumer stopped");
  }
}
