import { randomUUID } from "crypto";
import type { IOutboxWriter } from "../ports/outbox-writer.port";
import type { CreateOutboundDeliveryBody } from "../dtos/create-outbound-delivery.dto";

export const INTEGRATION_OUTBOUND_DISPATCH_EVENT = "integration.outbound_dispatch";

interface CreateOutboundDeliveryInput {
  body: CreateOutboundDeliveryBody;
  correlationId?: string;
}

export interface CreateOutboundDeliveryResult {
  accepted: true;
  deliveryId: string;
  endpoint: string;
  eventName: string;
}

export class CreateOutboundDeliveryUseCase {
  constructor(private readonly outboxWriter: IOutboxWriter) {}

  async execute(input: CreateOutboundDeliveryInput): Promise<CreateOutboundDeliveryResult> {
    const deliveryId = randomUUID();
    await this.outboxWriter.enqueue(INTEGRATION_OUTBOUND_DISPATCH_EVENT, {
      deliveryId,
      endpoint: input.body.endpoint,
      method: input.body.method,
      headers: input.body.headers ?? {},
      payload: input.body.payload ?? {},
      externalId: input.body.externalId ?? null,
      correlationId: input.correlationId ?? null,
      timeoutMs: input.body.timeoutMs ?? 5_000,
      maxAttempts: input.body.maxAttempts ?? 3,
      attempt: 1,
      createdAt: new Date().toISOString(),
    });

    return {
      accepted: true,
      deliveryId,
      endpoint: input.body.endpoint,
      eventName: INTEGRATION_OUTBOUND_DISPATCH_EVENT,
    };
  }
}
