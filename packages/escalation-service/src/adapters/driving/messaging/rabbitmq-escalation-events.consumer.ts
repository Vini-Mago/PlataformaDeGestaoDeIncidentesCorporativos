import amqp from "amqplib";
import { logger } from "@pgic/shared";
import {
  EXCHANGE_INCIDENT_EVENTS,
  EXCHANGE_SLA_EVENTS,
  QUEUE_INCIDENT_CREATED_ESCALATION,
  QUEUE_SLA_BREACH_ESCALATION,
  QUEUE_SLA_RISK_ESCALATION,
  INCIDENT_CREATED_EVENT,
  ROUTING_KEY_INCIDENT_CREATED,
  ROUTING_KEY_SLA_BREACH,
  ROUTING_KEY_SLA_RISK,
  incidentCreatedPayloadSchema,
  incidentDomainEventEnvelopeSchema,
  SLA_BREACH_EVENT,
  SLA_RISK_EVENT,
  slaBreachPayloadSchema,
  slaDomainEventEnvelopeSchema,
  slaRiskPayloadSchema,
} from "@pgic/shared";
import type { HandleEscalationDomainEventUseCase } from "../../../application/use-cases/handle-escalation-domain-event.use-case";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export class RabbitMqEscalationEventsConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private tags: string[] = [];

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly handleEvent: HandleEscalationDomainEventUseCase
  ) {}

  private async consumeQueue(
    queue: string,
    exchange: string,
    routingKey: string
  ): Promise<string> {
    await this.channel!.assertQueue(queue, { durable: true });
    await this.channel!.bindQueue(queue, exchange, routingKey);
    const { consumerTag } = await this.channel!.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        try {
          const raw = JSON.parse(msg.content.toString()) as unknown;
          const parsedIncidentEnvelope = incidentDomainEventEnvelopeSchema.safeParse(raw);
          if (parsedIncidentEnvelope.success && parsedIncidentEnvelope.data.type === INCIDENT_CREATED_EVENT) {
            const parsedPayload = incidentCreatedPayloadSchema.safeParse(parsedIncidentEnvelope.data.payload);
            if (!parsedPayload.success) {
              logger.warn({ queue, issues: parsedPayload.error.issues }, "escalation consumer invalid incident payload");
              this.channel?.nack(msg, false, false);
              return;
            }
            await this.handleEvent.execute(parsedIncidentEnvelope.data.type, parsedPayload.data);
            this.channel?.ack(msg);
            return;
          }

          const parsedSlaEnvelope = slaDomainEventEnvelopeSchema.safeParse(raw);
          if (parsedSlaEnvelope.success) {
            if (parsedSlaEnvelope.data.type === SLA_RISK_EVENT) {
              const parsedPayload = slaRiskPayloadSchema.safeParse(parsedSlaEnvelope.data.payload);
              if (!parsedPayload.success) {
                logger.warn({ queue, issues: parsedPayload.error.issues }, "escalation consumer invalid sla risk payload");
                this.channel?.nack(msg, false, false);
                return;
              }
              await this.handleEvent.execute(SLA_RISK_EVENT, parsedPayload.data);
              this.channel?.ack(msg);
              return;
            }
            if (parsedSlaEnvelope.data.type === SLA_BREACH_EVENT) {
              const parsedPayload = slaBreachPayloadSchema.safeParse(parsedSlaEnvelope.data.payload);
              if (!parsedPayload.success) {
                logger.warn({ queue, issues: parsedPayload.error.issues }, "escalation consumer invalid sla breach payload");
                this.channel?.nack(msg, false, false);
                return;
              }
              await this.handleEvent.execute(SLA_BREACH_EVENT, parsedPayload.data);
              this.channel?.ack(msg);
              return;
            }
          }

          logger.warn({ queue }, "escalation consumer unknown/invalid envelope, nack without requeue");
          this.channel?.nack(msg, false, false);
          return;
        } catch (err) {
          logger.error({ err, queue }, "escalation consumer failed");
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    return consumerTag;
  }

  async start(): Promise<void> {
    this.connection = await amqp.connect(this.rabbitmqUrl, { timeout: 10_000 });
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_INCIDENT_EVENTS, "topic", { durable: true });
    await this.channel.assertExchange(EXCHANGE_SLA_EVENTS, "topic", { durable: true });

    this.tags.push(
      await this.consumeQueue(
        QUEUE_INCIDENT_CREATED_ESCALATION,
        EXCHANGE_INCIDENT_EVENTS,
        ROUTING_KEY_INCIDENT_CREATED
      )
    );
    this.tags.push(
      await this.consumeQueue(QUEUE_SLA_RISK_ESCALATION, EXCHANGE_SLA_EVENTS, ROUTING_KEY_SLA_RISK)
    );
    this.tags.push(
      await this.consumeQueue(
        QUEUE_SLA_BREACH_ESCALATION,
        EXCHANGE_SLA_EVENTS,
        ROUTING_KEY_SLA_BREACH
      )
    );

    logger.info("escalation-service: domain event consumers started");
  }

  async stop(): Promise<void> {
    if (this.channel) {
      for (const tag of this.tags) {
        await this.channel.cancel(tag);
      }
      this.tags = [];
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
