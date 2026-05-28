import { describe, expect, it, vi } from "vitest";
import { PrismaProblemRepository } from "./prisma-problem.repository";
import { PROBLEM_INCIDENT_LINKED_EVENT, PROBLEM_INCIDENT_UNLINKED_EVENT } from "@pgic/shared";

interface TxStub {
  problemLinkedIncidentModel: {
    deleteMany: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
  };
  outboxModel: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe("PrismaProblemRepository link/unlink outbox", () => {
  it("writes linked event to outbox when linking incident", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createLink = vi.fn().mockResolvedValue({});
    const createOutbox = vi.fn().mockResolvedValue({});

    const prisma = {
      $transaction: async (fn: (tx: TxStub) => Promise<void>) =>
        fn({
          problemLinkedIncidentModel: {
            deleteMany,
            create: createLink,
          },
          outboxModel: {
            create: createOutbox,
          },
        }),
    };

    const repo = new PrismaProblemRepository(prisma as unknown as ConstructorParameters<typeof PrismaProblemRepository>[0]);
    await repo.linkIncident("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");

    expect(deleteMany).toHaveBeenCalledWith({ where: { incidentId: "22222222-2222-4222-8222-222222222222" } });
    expect(createLink).toHaveBeenCalledWith({
      data: {
        problemId: "11111111-1111-4111-8111-111111111111",
        incidentId: "22222222-2222-4222-8222-222222222222",
      },
    });
    expect(createOutbox).toHaveBeenCalledOnce();
    const outboxArg = createOutbox.mock.calls[0][0];
    expect(outboxArg.data.eventName).toBe(PROBLEM_INCIDENT_LINKED_EVENT);
    expect(outboxArg.data.payload).toMatchObject({
      problemId: "11111111-1111-4111-8111-111111111111",
      incidentId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("writes unlinked event to outbox when unlinking incident", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createOutbox = vi.fn().mockResolvedValue({});

    const prisma = {
      $transaction: async (fn: (tx: TxStub) => Promise<void>) =>
        fn({
          problemLinkedIncidentModel: {
            deleteMany,
          },
          outboxModel: {
            create: createOutbox,
          },
        }),
    };

    const repo = new PrismaProblemRepository(prisma as unknown as ConstructorParameters<typeof PrismaProblemRepository>[0]);
    await repo.unlinkIncident("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        problemId: "11111111-1111-4111-8111-111111111111",
        incidentId: "22222222-2222-4222-8222-222222222222",
      },
    });
    expect(createOutbox).toHaveBeenCalledOnce();
    const outboxArg = createOutbox.mock.calls[0][0];
    expect(outboxArg.data.eventName).toBe(PROBLEM_INCIDENT_UNLINKED_EVENT);
    expect(outboxArg.data.payload).toMatchObject({
      problemId: "11111111-1111-4111-8111-111111111111",
      incidentId: "22222222-2222-4222-8222-222222222222",
    });
  });
});
