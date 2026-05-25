import amqp from "amqplib";
import type { IEventPublisher } from "../../../application/ports/event-publisher.port";
import {
  EXCHANGE_REQUEST_EVENTS,
  ROUTING_KEY_REQUEST_APPROVED,
  ROUTING_KEY_REQUEST_COMPLETED,
  ROUTING_KEY_REQUEST_CREATED,
  ROUTING_KEY_REQUEST_IN_APPROVAL,
  ROUTING_KEY_REQUEST_REJECTED,
  ROUTING_KEY_REQUEST_STARTED,
  ROUTING_KEY_REQUEST_SUBMITTED,
  REQUEST_APPROVED_EVENT,
  REQUEST_COMPLETED_EVENT,
  REQUEST_CREATED_EVENT,
  REQUEST_IN_APPROVAL_EVENT,
  REQUEST_REJECTED_EVENT,
  REQUEST_STARTED_EVENT,
  REQUEST_SUBMITTED_EVENT,
  requestDomainEventEnvelopeSchema,
} from "@pgic/shared";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqRequestEventPublisherAdapter implements IEventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = EXCHANGE_REQUEST_EVENTS;
  private static readonly CONNECT_TIMEOUT_MS = 10_000;

  constructor(private readonly rabbitmqUrl: string) {}

  async connect(): Promise<void> {
    await this.cleanupConnection();
    this.connection = await amqp.connect(this.rabbitmqUrl, {
      timeout: RabbitMqRequestEventPublisherAdapter.CONNECT_TIMEOUT_MS,
    });
    this.connection.on("error", (err) => {
      this.connection = null;
      this.channel = null;
      console.error("RabbitMqRequestEventPublisher: connection error", err);
    });
    this.connection.on("close", () => {
      this.connection = null;
      this.channel = null;
    });
    this.channel = await this.connection.createChannel();
    this.channel.on("error", (err) => {
      this.channel = null;
      console.error("RabbitMqRequestEventPublisher: channel error", err);
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
      throw new Error("RabbitMqRequestEventPublisherAdapter not connected; call connect() before publishing.");
    }
    const parsedEnvelope = requestDomainEventEnvelopeSchema.safeParse({ type: eventName, payload });
    if (!parsedEnvelope.success) {
      throw new Error(`Invalid request domain event envelope: ${parsedEnvelope.error.message}`);
    }

    const routingKey =
      eventName === REQUEST_CREATED_EVENT
        ? ROUTING_KEY_REQUEST_CREATED
        : eventName === REQUEST_SUBMITTED_EVENT
          ? ROUTING_KEY_REQUEST_SUBMITTED
          : eventName === REQUEST_IN_APPROVAL_EVENT
            ? ROUTING_KEY_REQUEST_IN_APPROVAL
            : eventName === REQUEST_APPROVED_EVENT
              ? ROUTING_KEY_REQUEST_APPROVED
              : eventName === REQUEST_REJECTED_EVENT
                ? ROUTING_KEY_REQUEST_REJECTED
                : eventName === REQUEST_STARTED_EVENT
                  ? ROUTING_KEY_REQUEST_STARTED
                  : eventName === REQUEST_COMPLETED_EVENT
                    ? ROUTING_KEY_REQUEST_COMPLETED
                    : eventName.replace(/\./g, "_");
    const message = Buffer.from(JSON.stringify(parsedEnvelope.data));
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
