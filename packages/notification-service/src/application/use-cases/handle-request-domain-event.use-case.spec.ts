import { describe, it, expect, vi } from "vitest";
import { REQUEST_CREATED_EVENT, REQUEST_SUBMITTED_EVENT } from "@pgic/shared";
import { HandleRequestDomainEventUseCase } from "./handle-request-domain-event.use-case";
import { CreateNotificationUseCase } from "./create-notification.use-case";
import type { INotificationRepository } from "../ports/notification-repository.port";

describe("HandleRequestDomainEventUseCase", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const srId = "22222222-2222-2222-2222-222222222222";

  it("returns ok:false for unknown event type", async () => {
    const repo: INotificationRepository = { create: vi.fn(), list: vi.fn(), findById: vi.fn() };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo));
    const r = await uc.execute("unknown.event", { serviceRequestId: srId, requesterId: userId });
    expect(r).toEqual({ ok: false });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when payload invalid", async () => {
    const repo: INotificationRepository = { create: vi.fn(), list: vi.fn(), findById: vi.fn() };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo));
    const r = await uc.execute(REQUEST_CREATED_EVENT, { serviceRequestId: "not-uuid", requesterId: userId });
    expect(r).toEqual({ ok: false });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("creates in_app notification for request.created", async () => {
    const repo: INotificationRepository = {
      create: vi.fn().mockResolvedValue({ id: "n1" }),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo));
    const r = await uc.execute(REQUEST_CREATED_EVENT, {
      serviceRequestId: srId,
      requesterId: userId,
      catalogItemId: "33333333-3333-3333-3333-333333333333",
      status: "Draft",
      occurredAt: new Date().toISOString(),
    });
    expect(r).toEqual({ ok: true });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "in_app",
        recipient: userId,
        subject: "Requisição de serviço criada",
      })
    );
  });

  it("creates notification for request.submitted", async () => {
    const repo: INotificationRepository = {
      create: vi.fn().mockResolvedValue({ id: "n2" }),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo));
    const r = await uc.execute(REQUEST_SUBMITTED_EVENT, {
      serviceRequestId: srId,
      requesterId: userId,
      catalogItemId: "33333333-3333-3333-3333-333333333333",
      status: "Submitted",
      actorId: userId,
      fromStatus: "Draft",
      toStatus: "Submitted",
      occurredAt: new Date().toISOString(),
    });
    expect(r).toEqual({ ok: true });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "in_app",
        recipient: userId,
        subject: "Requisição submetida",
      })
    );
  });
});
