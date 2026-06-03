import amqp from "amqplib";
import { logger, consumeWithRetry } from "@pgic/shared";
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
        
        await consumeWithRetry(
          this.channel!,
          msg,
          async (payload: any, envelope: any) => {
            // Check if envelope type is INCIDENT_CREATED_EVENT
            const parsedIncidentEnvelope = incidentDomainEventEnvelopeSchema.safeParse(envelope);
            if (parsedIncidentEnvelope.success && parsedIncidentEnvelope.data.type === INCIDENT_CREATED_EVENT) {
              const parsedPayload = incidentCreatedPayloadSchema.safeParse(payload);
              if (!parsedPayload.success) {
                throw new Error(`Escalation consumer: Invalid incident payload: ${JSON.stringify(parsedPayload.error.issues)}`); // Terminal error
              }
              await this.handleEvent.execute(parsedIncidentEnvelope.data.type, parsedPayload.data);
              return;
            }

            // Check if envelope is SLA event
            const parsedSlaEnvelope = slaDomainEventEnvelopeSchema.safeParse(envelope);
            if (parsedSlaEnvelope.success) {
              if (parsedSlaEnvelope.data.type === SLA_RISK_EVENT) {
                const parsedPayload = slaRiskPayloadSchema.safeParse(payload);
                if (!parsedPayload.success) {
                  throw new Error(`Escalation consumer: Invalid SLA risk payload: ${JSON.stringify(parsedPayload.error.issues)}`); // Terminal error
                }
                await this.handleEvent.execute(SLA_RISK_EVENT, parsedPayload.data);
                return;
              }
              if (parsedSlaEnvelope.data.type === SLA_BREACH_EVENT) {
                const parsedPayload = slaBreachPayloadSchema.safeParse(payload);
                if (!parsedPayload.success) {
                  throw new Error(`Escalation consumer: Invalid SLA breach payload: ${JSON.stringify(parsedPayload.error.issues)}`); // Terminal error
                }
                await this.handleEvent.execute(SLA_BREACH_EVENT, parsedPayload.data);
                return;
              }
            }

            // If envelope doesn't match any supported contract
            throw new Error(`Escalation consumer: Unknown or invalid envelope structure for event type: ${envelope?.type}`); // Terminal error
          },
          { queueName: queue, maxAttempts: 3 }
        );
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
        await this.channel.cancel(tag).catch(() => {});
      }
      this.tags = [];
      await this.channel.close().catch(() => {});
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close().catch(() => {});
      this.connection = null;
    }
  }
}
