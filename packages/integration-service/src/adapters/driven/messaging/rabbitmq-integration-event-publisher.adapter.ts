import amqp from "amqplib";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";
import {
  EXCHANGE_INTEGRATION_EVENTS,
  INTEGRATION_INCIDENT_INGEST_EVENT,
  ROUTING_KEY_INCIDENT_INGEST,
} from "@pgic/shared";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqIntegrationEventPublisherAdapter implements IEventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(private readonly rabbitmqUrl: string) {}

  async connect(): Promise<void> {
    await this.cleanupConnection();
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqIntegrationEventPublisherAdapter.CONNECT_TIMEOUT_MS,
    });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_INTEGRATION_EVENTS, "topic", { durable: true });
  }

  private async cleanupConnection(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
      } catch {
        /* ignore */
      }
      this.channel = null;
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch {
        /* ignore */
      }
      this.connection = null;
    }
  }

  async publish(eventName: string, payload: object): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMqIntegrationEventPublisherAdapter not connected");
    }
    const routingKey =
      eventName === INTEGRATION_INCIDENT_INGEST_EVENT
        ? ROUTING_KEY_INCIDENT_INGEST
        : eventName.replace(/\./g, "_");
    const message = Buffer.from(JSON.stringify({ type: eventName, payload }));
    const ok = this.channel.publish(EXCHANGE_INTEGRATION_EVENTS, routingKey, message, {
      persistent: true,
    });
    if (!ok) {
      await new Promise<void>((resolve) => this.channel!.once("drain", resolve));
    }
  }

  async disconnect(): Promise<void> {
    await this.cleanupConnection();
  }
}
