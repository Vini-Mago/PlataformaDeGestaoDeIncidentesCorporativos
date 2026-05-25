import { describe, expect, it, vi } from "vitest";
import {
  CreateOutboundDeliveryUseCase,
  INTEGRATION_OUTBOUND_DISPATCH_EVENT,
} from "./create-outbound-delivery.use-case";

describe("CreateOutboundDeliveryUseCase", () => {
  it("enfileira entrega outbound com defaults de timeout/tentativas", async () => {
    const outbox = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const uc = new CreateOutboundDeliveryUseCase(outbox);

    const res = await uc.execute({
      body: {
        endpoint: "https://example.test/hook",
        method: "POST",
      },
      correlationId: "corr-123",
    });

    expect(res.accepted).toBe(true);
    expect(res.eventName).toBe(INTEGRATION_OUTBOUND_DISPATCH_EVENT);
    expect(outbox.enqueue).toHaveBeenCalledOnce();
    expect(outbox.enqueue).toHaveBeenCalledWith(
      INTEGRATION_OUTBOUND_DISPATCH_EVENT,
      expect.objectContaining({
        endpoint: "https://example.test/hook",
        method: "POST",
        correlationId: "corr-123",
        timeoutMs: 5000,
        maxAttempts: 3,
        attempt: 1,
      })
    );
  });
});
