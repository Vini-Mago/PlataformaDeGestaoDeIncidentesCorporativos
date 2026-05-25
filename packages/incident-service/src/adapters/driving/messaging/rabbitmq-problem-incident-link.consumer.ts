import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_PROBLEM_EVENTS,
  problemChangeEventEnvelopeSchema,
  problemIncidentLinkPayloadSchema,
  PROBLEM_INCIDENT_LINKED_EVENT,
  PROBLEM_INCIDENT_UNLINKED_EVENT,
  QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT,
  ROUTING_KEY_PROBLEM_INCIDENT_LINKED,
  ROUTING_KEY_PROBLEM_INCIDENT_UNLINKED,
} from "@pgic/shared";
import type { HandleProblemIncidentLinkUseCase } from "../../../application/use-cases/handle-problem-incident-link.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type EventType = typeof PROBLEM_INCIDENT_LINKED_EVENT | typeof PROBLEM_INCIDENT_UNLINKED_EVENT;
const LOG_CONTEXT = "problem-incident-link-consumer";

export class RabbitMqProblemIncidentLinkConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleLink: HandleProblemIncidentLinkUseCase
  ) {}

  private async handleEvent(type: EventType, payload: unknown): Promise<boolean> {
    if (type === PROBLEM_INCIDENT_LINKED_EVENT) {
      const result = await this.handleLink.link(payload);
      return result.ok;
    }
    const result = await this.handleLink.unlink(payload);
    return result.ok;
  }

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, { timeout: 10_000 });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_PROBLEM_EVENTS, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT, { durable: true });
    await this.channel.bindQueue(
      QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT,
      EXCHANGE_PROBLEM_EVENTS,
      ROUTING_KEY_PROBLEM_INCIDENT_LINKED
    );
    await this.channel.bindQueue(
      QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT,
      EXCHANGE_PROBLEM_EVENTS,
      ROUTING_KEY_PROBLEM_INCIDENT_UNLINKED
    );

    const { consumerTag } = await this.channel.consume(
      QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT,
      async (msg) => {
        if (!msg) return;
        try {
          const parsedEnvelope = problemChangeEventEnvelopeSchema.safeParse(JSON.parse(msg.content.toString()));
          if (!parsedEnvelope.success) {
            logger.warn({ context: LOG_CONTEXT, issues: parsedEnvelope.error.issues }, "invalid envelope");
            this.channel?.nack(msg, false, false);
            return;
          }
          if (parsedEnvelope.data.type !== PROBLEM_INCIDENT_LINKED_EVENT && parsedEnvelope.data.type !== PROBLEM_INCIDENT_UNLINKED_EVENT) {
            this.channel?.nack(msg, false, false);
            return;
          }
          const parsedPayload = problemIncidentLinkPayloadSchema.safeParse(parsedEnvelope.data.payload);
          if (!parsedPayload.success) {
            logger.warn({ context: LOG_CONTEXT, issues: parsedPayload.error.issues }, "invalid payload");
            this.channel?.nack(msg, false, false);
            return;
          }
          const ok = await this.handleEvent(parsedEnvelope.data.type, parsedPayload.data);
          if (ok) this.channel?.ack(msg);
          else this.channel?.nack(msg, false, false);
        } catch (err) {
          logger.error({ context: LOG_CONTEXT, err }, "message handling failed");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    this.consumerTag = consumerTag;
    logger.info({ context: LOG_CONTEXT, queue: QUEUE_PROBLEM_INCIDENT_LINKS_INCIDENT }, "consumer started");
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
