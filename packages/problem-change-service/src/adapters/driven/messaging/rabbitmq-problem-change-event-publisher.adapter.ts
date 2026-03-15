import amqp from "amqplib";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";
import {
  EXCHANGE_PROBLEM_EVENTS,
  EXCHANGE_CHANGE_EVENTS,
  ROUTING_KEY_PROBLEM_CREATED,
  ROUTING_KEY_CHANGE_CREATED,
  PROBLEM_CREATED_EVENT,
  CHANGE_CREATED_EVENT,
} from "@pgic/shared";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqProblemChangeEventPublisherAdapter implements IEventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(private readonly rabbitmqUrl: string) {}

  async connect(): Promise<void> {
    await this.cleanupConnection();
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqProblemChangeEventPublisherAdapter.CONNECT_TIMEOUT_MS,
    });
    this.connection.on("error", () => {
      this.connection = null;
      this.channel = null;
    });
    this.connection.on("close", () => {
      this.connection = null;
      this.channel = null;
    });
    this.channel = await this.connection.createChannel();
    this.channel.on("error", () => {
      this.channel = null;
    });
    this.channel.on("close", () => {
      this.channel = null;
    });
    await this.channel.assertExchange(EXCHANGE_PROBLEM_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_CHANGE_EVENTS, "topic", { durable: true });
  }

  private async cleanupConnection(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch {
        // ignore
      }
      this.connection = null;
    }
  }

  async publish(eventName: string, payload: object): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMqProblemChangeEventPublisherAdapter not connected; call connect() before publishing.");
    }
    const exchange =
      eventName === PROBLEM_CREATED_EVENT ? EXCHANGE_PROBLEM_EVENTS : EXCHANGE_CHANGE_EVENTS;
    const routingKey =
      eventName === PROBLEM_CREATED_EVENT
        ? ROUTING_KEY_PROBLEM_CREATED
        : eventName === CHANGE_CREATED_EVENT
          ? ROUTING_KEY_CHANGE_CREATED
          : eventName.replace(/\./g, "_");
    const message = Buffer.from(JSON.stringify({ type: eventName, payload }));
    const ok = this.channel.publish(exchange, routingKey, message, { persistent: true });
    if (!ok) {
      await new Promise<void>((resolve) => this.channel!.once("drain", resolve));
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch {
      // ignore
    } finally {
      this.channel = null;
      try {
        if (this.connection) {
          await this.connection.close();
        }
      } catch {
        // ignore
      } finally {
        this.connection = null;
      }
    }
  }
}
