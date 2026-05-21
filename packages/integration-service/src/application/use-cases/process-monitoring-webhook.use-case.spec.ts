import { describe, it, expect, vi } from "vitest";
import { ProcessMonitoringWebhookUseCase } from "./process-monitoring-webhook.use-case";

describe("ProcessMonitoringWebhookUseCase", () => {
  it("enfileira evento de ingestão e regista log", async () => {
    const logRepo = {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
      list: vi.fn(),
    };
    const outbox = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const uc = new ProcessMonitoringWebhookUseCase(logRepo, outbox);

    const result = await uc.execute({
      body: {
        externalId: "alert-99",
        title: "Servidor down",
        severity: "critical",
      },
      systemUserId: "system-user",
    });

    expect(result.accepted).toBe(true);
    expect(outbox.enqueue).toHaveBeenCalledOnce();
    expect(logRepo.create).toHaveBeenCalledOnce();
  });
});
