import { describe, it, expect, vi, beforeEach } from "vitest";
import { consumeWithRetry, isTransientError } from "./rabbitmq.helpers";

describe("rabbitmq.helpers", () => {
  describe("isTransientError", () => {
    it("returns true for database connection errors", () => {
      expect(isTransientError(new Error("Connection refused to postgres"))).toBe(true);
      expect(isTransientError(new Error("prisma: Can't reach database server"))).toBe(true);
      expect(isTransientError(new Error("ETIMEDOUT: network connection failed"))).toBe(true);
    });

    it("returns false for business validation or syntax errors", () => {
      expect(isTransientError(new Error("Validation failed: email is invalid"))).toBe(false);
      expect(isTransientError(new Error("Unexpected token < in JSON"))).toBe(false);
      expect(isTransientError(new Error("Incident not found: 123"))).toBe(false);
    });
  });

  describe("consumeWithRetry", () => {
    let mockChannel: {
      ack: ReturnType<typeof vi.fn>;
      nack: ReturnType<typeof vi.fn>;
      sendToQueue: ReturnType<typeof vi.fn>;
      assertQueue: ReturnType<typeof vi.fn>;
    };
    let mockMsg: {
      content: Buffer;
      properties: {
        correlationId: string;
        headers: Record<string, unknown>;
      };
      fields: {
        exchange: string;
        routingKey: string;
      };
    };

    beforeEach(() => {
      mockChannel = {
        ack: vi.fn(),
        nack: vi.fn(),
        sendToQueue: vi.fn(),
        assertQueue: vi.fn().mockResolvedValue({}),
      };

      mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            type: "incident.created",
            correlationId: "corr-123",
            payload: {
              incidentId: "33333333-3333-3333-3333-333333333333",
              title: "Server Down",
            },
          })
        ),
        properties: {
          correlationId: "corr-123",
          headers: {},
        },
        fields: {
          exchange: "incident.events",
          routingKey: "incident_created",
        },
      };
    });

    it("acknowledges the message on successful handler execution", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      await consumeWithRetry(mockChannel, mockMsg, handler, { queueName: "test.queue" });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ incidentId: "33333333-3333-3333-3333-333333333333" }),
        expect.objectContaining({ type: "incident.created" })
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
      expect(mockChannel.nack).not.toHaveBeenCalled();
      expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
    });

    it("routes to DLQ and acks the message on terminal errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Terminal business logic error"));

      await consumeWithRetry(mockChannel, mockMsg, handler, { queueName: "test.queue" });

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith("test.queue.failed", { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        "test.queue.failed",
        expect.any(Buffer),
        expect.objectContaining({
          correlationId: "corr-123",
        })
      );

      const dlqPayload = JSON.parse(mockChannel.sendToQueue.mock.calls[0][1].toString());
      expect(dlqPayload).toMatchObject({
        eventName: "incident.created",
        correlationId: "corr-123",
        errorMessage: "Terminal business logic error",
      });
    });

    it("re-queues the message with incremented x-attempt on transient errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Database connection refused"));

      await consumeWithRetry(mockChannel, mockMsg, handler, { queueName: "test.queue", maxAttempts: 3 });

      // Should republish to the same queue with x-attempt = 2
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        "test.queue",
        mockMsg.content,
        expect.objectContaining({
          headers: {
            "x-attempt": 2,
          },
        })
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("routes to DLQ on the final transient attempt when maxAttempts is reached", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Database connection refused"));
      mockMsg.properties.headers["x-attempt"] = 3; // On final attempt

      await consumeWithRetry(mockChannel, mockMsg, handler, { queueName: "test.queue", maxAttempts: 3 });

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith("test.queue.failed", { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        "test.queue.failed",
        expect.any(Buffer),
        expect.any(Object)
      );

      const dlqPayload = JSON.parse(mockChannel.sendToQueue.mock.calls[0][1].toString());
      expect(dlqPayload.errorMessage).toBe("Database connection refused");
    });
  });
});
