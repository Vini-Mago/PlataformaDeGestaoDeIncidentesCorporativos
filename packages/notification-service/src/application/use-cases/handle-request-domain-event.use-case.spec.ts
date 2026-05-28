import { describe, it, expect, vi } from "vitest";
import { REQUEST_CREATED_EVENT, REQUEST_SUBMITTED_EVENT } from "@pgic/shared";
import { HandleRequestDomainEventUseCase } from "./handle-request-domain-event.use-case";
import { CreateNotificationUseCase } from "./create-notification.use-case";
import type { INotificationRepository } from "../ports/notification-repository.port";
import type { IEmailSender } from "../ports/email-sender.port";

describe("HandleRequestDomainEventUseCase", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const srId = "22222222-2222-2222-2222-222222222222";
  const requesterEmail = "requester@example.com";
  const emailSender: IEmailSender = { send: vi.fn() };

  it("returns ok:false for unknown event type", async () => {
    const repo: INotificationRepository = {
      create: vi.fn(),
      markAsSent: vi.fn(),
      markAsFailed: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo, emailSender));
    const r = await uc.execute("unknown.event", { serviceRequestId: srId, requesterId: userId });
    expect(r).toEqual({ ok: false });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("returns ok:false when payload invalid", async () => {
    const repo: INotificationRepository = {
      create: vi.fn(),
      markAsSent: vi.fn(),
      markAsFailed: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo, emailSender));
    const r = await uc.execute(REQUEST_CREATED_EVENT, { serviceRequestId: "not-uuid", requesterId: userId });
    expect(r).toEqual({ ok: false });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("creates in_app notification for request.created", async () => {
    const repo: INotificationRepository = {
      create: vi.fn().mockResolvedValue({ id: "n1" }),
      markAsSent: vi.fn(),
      markAsFailed: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo, emailSender));
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

  it("creates in_app and email notifications for request.submitted when requesterEmail is available", async () => {
    const repo: INotificationRepository = {
      create: vi.fn(async (input) => ({
        id: `${input.type}-n2`,
        type: input.type,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body ?? null,
        status: "pending",
        sentAt: null,
        deliveredAt: null,
        failedAt: null,
        errorMessage: null,
        createdAt: new Date(),
      })),
      markAsSent: vi.fn(async (id) => ({
        id,
        type: "email",
        recipient: requesterEmail,
        subject: "Requisição submetida",
        body: "sent",
        status: "sent",
        sentAt: new Date(),
        deliveredAt: new Date(),
        failedAt: null,
        errorMessage: null,
        createdAt: new Date(),
      })),
      markAsFailed: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new HandleRequestDomainEventUseCase(new CreateNotificationUseCase(repo, emailSender));
    const r = await uc.execute(REQUEST_SUBMITTED_EVENT, {
      serviceRequestId: srId,
      requesterId: userId,
      requesterEmail,
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
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "email",
        recipient: requesterEmail,
        subject: "Requisição submetida",
      })
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: requesterEmail,
        subject: "Requisição submetida",
      })
    );
  });
});
