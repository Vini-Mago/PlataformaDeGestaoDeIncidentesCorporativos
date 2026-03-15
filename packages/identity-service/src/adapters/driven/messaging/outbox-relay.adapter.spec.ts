import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutboxRelayAdapter } from "./outbox-relay.adapter";

function rawRow(overrides: {
  id: string;
  event_name: string;
  payload: unknown;
  created_at?: Date;
  published_at?: Date | null;
  claimed_at?: Date | null;
  failed_at?: Date | null;
}) {
  const now = new Date();
  return {
    id: overrides.id,
    event_name: overrides.event_name,
    payload: overrides.payload,
    created_at: overrides.created_at ?? now,
    published_at: overrides.published_at ?? null,
    claimed_at: overrides.claimed_at ?? null,
    failed_at: overrides.failed_at ?? null,
  };
}

describe("OutboxRelayAdapter", () => {
  const mockOutboxUpdate = vi.fn();
  const mockQueryRaw = vi.fn();
  const mockTransaction = vi.fn();

  const mockPrisma = {
    $transaction: mockTransaction,
    outboxModel: { update: mockOutboxUpdate },
  };
  const mockEventPublisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        $queryRaw: mockQueryRaw,
        outboxModel: { update: mockOutboxUpdate },
      };
      return fn(mockTx);
    });
  });

  it("does nothing when no unpublished rows exist", async () => {
    mockQueryRaw.mockResolvedValue([]);
    const relay = new OutboxRelayAdapter(
      mockPrisma as never,
      mockEventPublisher as never,
      10
    );

    await relay.runOnce();

    expect(mockQueryRaw).toHaveBeenCalled();
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    expect(mockOutboxUpdate).not.toHaveBeenCalled();
  });

  it("publishes each row and marks as published", async () => {
    const now = new Date();
    const rows = [
      rawRow({ id: "outbox-1", event_name: "user.created", payload: { userId: "u1", email: "a@b.com" }, created_at: now }),
      rawRow({ id: "outbox-2", event_name: "user.created", payload: { userId: "u2", email: "c@d.com" }, created_at: now }),
    ];
    mockQueryRaw.mockResolvedValue(rows);
    mockOutboxUpdate.mockResolvedValue({});

    const relay = new OutboxRelayAdapter(
      mockPrisma as never,
      mockEventPublisher as never,
      50
    );

    await relay.runOnce();

    expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
    expect(mockEventPublisher.publish).toHaveBeenNthCalledWith(1, "user.created", { userId: "u1", email: "a@b.com" });
    expect(mockEventPublisher.publish).toHaveBeenNthCalledWith(2, "user.created", { userId: "u2", email: "c@d.com" });
    // In-tx: 2 claim updates; after: 2 publishedAt updates
    expect(mockOutboxUpdate).toHaveBeenCalledTimes(4);
    expect(mockOutboxUpdate).toHaveBeenNthCalledWith(1, { where: { id: "outbox-1" }, data: { claimedAt: expect.any(Date) } });
    expect(mockOutboxUpdate).toHaveBeenNthCalledWith(2, { where: { id: "outbox-2" }, data: { claimedAt: expect.any(Date) } });
    expect(mockOutboxUpdate).toHaveBeenNthCalledWith(3, { where: { id: "outbox-1" }, data: { publishedAt: expect.any(Date) } });
    expect(mockOutboxUpdate).toHaveBeenNthCalledWith(4, { where: { id: "outbox-2" }, data: { publishedAt: expect.any(Date) } });
  });

  it("does not mark row as published when publish throws", async () => {
    const rows = [rawRow({ id: "outbox-1", event_name: "user.created", payload: { userId: "u1" } })];
    mockQueryRaw.mockResolvedValue(rows);
    vi.mocked(mockEventPublisher.publish).mockRejectedValueOnce(new Error("Broker down"));

    const relay = new OutboxRelayAdapter(mockPrisma as never, mockEventPublisher as never);

    await relay.runOnce();

    expect(mockEventPublisher.publish).toHaveBeenCalledWith("user.created", { userId: "u1" });
    // Only claim update inside tx; no publishedAt because publish threw
    expect(mockOutboxUpdate).toHaveBeenCalledTimes(1);
    expect(mockOutboxUpdate).toHaveBeenCalledWith({ where: { id: "outbox-1" }, data: { claimedAt: expect.any(Date) } });
  });

  it("continues to next row when one publish fails", async () => {
    const rows = [
      rawRow({ id: "outbox-1", event_name: "user.created", payload: { userId: "u1" } }),
      rawRow({ id: "outbox-2", event_name: "user.created", payload: { userId: "u2" } }),
    ];
    mockQueryRaw.mockResolvedValue(rows);
    vi.mocked(mockEventPublisher.publish).mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce(undefined);
    mockOutboxUpdate.mockResolvedValue({});

    const relay = new OutboxRelayAdapter(mockPrisma as never, mockEventPublisher as never);

    await relay.runOnce();

    // In-tx: 2 claim updates; after: 1 publishedAt (outbox-2 only)
    expect(mockOutboxUpdate).toHaveBeenCalledTimes(3);
    expect(mockOutboxUpdate).toHaveBeenNthCalledWith(3, { where: { id: "outbox-2" }, data: { publishedAt: expect.any(Date) } });
  });

  it("start sets interval and stop clears it", () => {
    vi.useFakeTimers();
    mockQueryRaw.mockResolvedValue([]);
    const relay = new OutboxRelayAdapter(mockPrisma as never, mockEventPublisher as never);

    relay.start(1000);
    expect(mockQueryRaw).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(mockQueryRaw).toHaveBeenCalled();

    relay.stop();
    vi.advanceTimersByTime(2000);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("start is idempotent (does not add second interval)", () => {
    vi.useFakeTimers();
    mockQueryRaw.mockResolvedValue([]);
    const relay = new OutboxRelayAdapter(mockPrisma as never, mockEventPublisher as never);

    relay.start(1000);
    relay.start(1000);
    vi.advanceTimersByTime(1000);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
