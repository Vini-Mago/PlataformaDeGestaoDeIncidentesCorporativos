import amqp from "amqplib";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";
import {
  EXCHANGE_INCIDENT_EVENTS,
  ROUTING_KEY_INCIDENT_CREATED,
  ROUTING_KEY_INCIDENT_STATUS_CHANGED,
  ROUTING_KEY_INCIDENT_ASSIGNED,
  INCIDENT_CREATED_EVENT,
  INCIDENT_STATUS_CHANGED_EVENT,
  INCIDENT_ASSIGNED_EVENT,
} from "@pgic/shared";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqIncidentEventPublisherAdapter implements IEventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = EXCHANGE_INCIDENT_EVENTS;
  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(private readonly rabbitmqUrl: string) {}

  async connect(): Promise<void> {
    await this.cleanupConnection();
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqIncidentEventPublisherAdapter.CONNECT_TIMEOUT_MS,
    });
    this.connection.on("error", (err) => {
      this.connection = null;
      this.channel = null;
      console.error("RabbitMqIncidentEventPublisher: connection error", err);
    });
    this.connection.on("close", () => {
      this.connection = null;
      this.channel = null;
    });
    this.channel = await this.connection.createChannel();
    this.channel.on("error", (err) => {
      this.channel = null;
      console.error("RabbitMqIncidentEventPublisher: channel error", err);
    });
    this.channel.on("close", () => {
      this.channel = null;
    });
    await this.channel.assertExchange(this.exchange, "topic", { durable: true });
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
      throw new Error("RabbitMqIncidentEventPublisherAdapter not connected; call connect() before publishing.");
    }
    const routingKey =
      eventName === INCIDENT_CREATED_EVENT
        ? ROUTING_KEY_INCIDENT_CREATED
        : eventName === INCIDENT_STATUS_CHANGED_EVENT
          ? ROUTING_KEY_INCIDENT_STATUS_CHANGED
          : eventName === INCIDENT_ASSIGNED_EVENT
            ? ROUTING_KEY_INCIDENT_ASSIGNED
            : eventName.replace(/\./g, "_");
    const message = Buffer.from(JSON.stringify({ type: eventName, payload }));
    this.channel.publish(this.exchange, routingKey, message, { persistent: true });
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch {
      // ignore channel close errors
    } finally {
      this.channel = null;
      try {
        if (this.connection) {
          await this.connection.close();
        }
      } catch {
        // ignore connection close errors
      } finally {
        this.connection = null;
      }
    }
  }
}
