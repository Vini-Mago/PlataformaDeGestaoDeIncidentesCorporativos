import amqp from "amqplib";
import { logger } from "./logger";

export interface ConsumerOptions {
  queueName: string;
  maxAttempts?: number;
}

/**
 * Classifies an error into transient vs terminal.
 * Transient errors include network issues, database connection timeouts, or Prisma initialization/query failures.
 * Terminal errors include business logic exceptions, payload structure mismatches, or syntax errors.
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  
  return (
    msg.includes("connect") ||
    msg.includes("connection") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("prisma") && (
      msg.includes("initialization") || 
      msg.includes("query engine") || 
      msg.includes("reach") || 
      msg.includes("connect")
    )
  );
}

/**
 * Routes a failed message to a Dead Letter Queue (DLQ) with rich diagnostic metadata.
 */
export async function sendToDlq(
  channel: amqp.Channel,
  msg: amqp.ConsumeMessage,
  dlqQueue: string,
  correlationId: string,
  eventName: string,
  errorMessage: string
): Promise<void> {
  try {
    // Assert the DLQ queue durably so it persists
    await channel.assertQueue(dlqQueue, { durable: true });

    let originalPayload: unknown;
    try {
      originalPayload = JSON.parse(msg.content.toString());
    } catch {
      originalPayload = msg.content.toString();
    }

    const dlqEnvelope = {
      eventName,
      correlationId,
      errorMessage,
      failedAt: new Date().toISOString(),
      originalPayload,
    };

    channel.sendToQueue(dlqQueue, Buffer.from(JSON.stringify(dlqEnvelope)), {
      persistent: true,
      correlationId,
      headers: {
        "x-original-exchange": msg.fields.exchange,
        "x-original-routing-key": msg.fields.routingKey,
        "x-error-message": errorMessage,
      },
    });

    logger.info({ correlationId, eventName, dlqQueue }, "Successfully routed failed message to DLQ");
  } catch (dlqErr) {
    logger.error({ err: dlqErr, correlationId, eventName, dlqQueue }, "Failed to write message to DLQ");
  }
}

/**
 * Wraps consumer callbacks with standard transient/terminal classification,
 * exponential backoff retry (with backoff sleep before requeue), correlationId extraction,
 * structured logging, and automated DLQ dead-lettering.
 */
export async function consumeWithRetry(
  channel: amqp.Channel,
  msg: amqp.ConsumeMessage | null,
  handler: (payload: unknown, envelope: unknown) => Promise<void>,
  options: ConsumerOptions
): Promise<void> {
  if (!msg) return;

  const maxAttempts = options.maxAttempts ?? 3;
  const queue = options.queueName;
  const dlqQueue = `${queue}.failed`;

  let eventName = "unknown";
  let correlationId = "";

  try {
    const content = msg.content.toString();
    const envelope = JSON.parse(content) as { type?: string; eventName?: string; correlationId?: string; payload?: Record<string, unknown> };
    
    eventName = envelope?.type || envelope?.eventName || "unknown";
    correlationId =
      msg.properties.correlationId ||
      envelope?.correlationId ||
      (envelope?.payload?.correlationId as string) ||
      "";

    // Determine current attempt number
    let attempt = 1;
    const headers = msg.properties.headers || {};
    if (headers["x-attempt"] !== undefined) {
      attempt = Number(headers["x-attempt"]);
    } else if (headers["x-death"]) {
      // If previously dead-lettered, RabbitMQ sets x-death count
      const deaths = headers["x-death"] as Array<{ count?: number }>;
      if (Array.isArray(deaths) && deaths.length > 0) {
        attempt = Number(deaths[0].count) + 1;
      }
    }

    if (attempt > maxAttempts) {
      logger.error(
        { correlationId, eventName, attempt, queue, errorMessage: `Exceeded max attempts (${maxAttempts})` },
        "Message retry: Max attempts exceeded, routing to DLQ"
      );
      await sendToDlq(channel, msg, dlqQueue, correlationId, eventName, `Exceeded max attempts (${maxAttempts})`);
      channel.ack(msg);
      return;
    }

    // Execute original handler
    await handler(envelope.payload ?? envelope, envelope);

    // Success -> Ack
    channel.ack(msg);
  } catch (err) {
    const isTransient = isTransientError(err);
    const errMsg = err instanceof Error ? err.message : String(err);
    
    // Parse current attempt count again
    const headers = msg.properties.headers || {};
    let attempt = 1;
    if (headers["x-attempt"] !== undefined) {
      attempt = Number(headers["x-attempt"]);
    } else if (headers["x-death"]) {
      const deaths = headers["x-death"] as Array<{ count?: number }>;
      if (Array.isArray(deaths) && deaths.length > 0) {
        attempt = Number(deaths[0].count);
      }
    }

    logger.warn(
      { correlationId, eventName, attempt, queue, isTransient, errorMessage: errMsg },
      isTransient
        ? "Message consumer: Transient error occurred during message processing"
        : "Message consumer: Terminal error occurred during message processing"
    );

    if (isTransient && attempt < maxAttempts) {
      const nextAttempt = attempt + 1;
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff: 1s, 2s, 4s, etc. capped at 10s

      logger.info(
        { queue, nextAttempt, delayMs, correlationId },
        `Message consumer: Scheduling retry attempt ${nextAttempt} in ${delayMs}ms`
      );

      // Sleep to backoff before requeue (prevents high-frequency spin loops)
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Re-publish the message with updated attempt count header
      // We republish to the same queue to preserve properties/headers or call nack with requeue if using basic headers
      const propertiesCopy = {
        ...msg.properties,
        headers: {
          ...headers,
          "x-attempt": nextAttempt,
        },
      };
      
      // Publish back to the queue and ack the old one to increment retry cleanly without tight consumer nack spinning
      channel.sendToQueue(queue, msg.content, propertiesCopy);
      channel.ack(msg);
    } else {
      // Terminal error OR retries exhausted -> DLQ
      logger.error(
        { correlationId, eventName, attempt, queue, errorMessage: errMsg },
        "Message consumer: Dead-lettering failed message"
      );
      await sendToDlq(channel, msg, dlqQueue, correlationId, eventName, errMsg);
      channel.ack(msg);
    }
  }
}
