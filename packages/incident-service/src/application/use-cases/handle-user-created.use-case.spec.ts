import { describe, it, expect, vi, beforeEach } from "vitest";
import { HandleUserCreatedUseCase } from "./handle-user-created.use-case";
import type { IReplicatedUserStore } from "../ports/replicated-user-store.port";

describe("HandleUserCreatedUseCase", () => {
  let replicatedUserStore: IReplicatedUserStore;

  beforeEach(() => {
    replicatedUserStore = {
      upsert: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
  });

  it("upserts user when payload is valid", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);
    const payload = {
      userId: "u1",
      email: "u@test.com",
      name: "User",
      occurredAt: "2025-01-01T00:00:00.000Z",
    };

    const result = await useCase.execute(payload);

    expect(result).toEqual({ ok: true });
    expect(replicatedUserStore.upsert).toHaveBeenCalledWith({
      id: "u1",
      email: "u@test.com",
      name: "User",
      lastEventOccurredAt: new Date("2025-01-01T00:00:00.000Z"),
    });
  });

  it("returns ok: false for invalid payload", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);
    const payload = { userId: "u1", email: "invalid-email", name: "" };

    const result = await useCase.execute(payload);

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });
});
