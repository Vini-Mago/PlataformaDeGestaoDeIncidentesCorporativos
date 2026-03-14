import { describe, it, expect, vi, beforeEach } from "vitest";
import { HandleUserCreatedUseCase } from "./handle-user-created.use-case";
import type { IReplicatedUserStore } from "../ports/replicated-user-store.port";

describe("HandleUserCreatedUseCase", () => {
  let replicatedUserStore: IReplicatedUserStore;

  const validPayload = {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    name: "John Doe",
    occurredAt: "2025-03-14T12:00:00.000Z",
  };

  beforeEach(() => {
    replicatedUserStore = {
      upsert: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
  });

  it("upserts replicated user with valid payload (typical)", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);

    const result = await useCase.execute(validPayload);

    expect(result).toEqual({ ok: true });
    expect(replicatedUserStore.upsert).toHaveBeenCalledWith({
      id: validPayload.userId,
      email: validPayload.email,
      name: validPayload.name,
      lastEventOccurredAt: new Date(validPayload.occurredAt),
    });
  });

  it("returns ok: false with invalid_payload when payload is null", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);

    const result = await useCase.execute(null);

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });

  it("returns ok: false when payload is missing userId", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);
    const invalid = { email: "u@e.com", name: "User", occurredAt: "2025-03-14T12:00:00.000Z" };

    const result = await useCase.execute(invalid);

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });

  it("returns ok: false when email contains < or > (XSS/injection attempt)", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);
    const invalid = { ...validPayload, email: "<script>alert(1)</script>" };

    const result = await useCase.execute(invalid);

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });

  it("returns ok: false when occurredAt is not ISO 8601 datetime", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);
    const invalid = { ...validPayload, occurredAt: "not-a-date" };

    const result = await useCase.execute(invalid);

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });

  it("returns ok: false when payload is empty object", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);

    const result = await useCase.execute({});

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });

  it("returns ok: false when payload is a string (unusual)", async () => {
    const useCase = new HandleUserCreatedUseCase(replicatedUserStore);

    const result = await useCase.execute("invalid");

    expect(result).toEqual({ ok: false, reason: "invalid_payload" });
    expect(replicatedUserStore.upsert).not.toHaveBeenCalled();
  });
});
