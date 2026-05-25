import { describe, expect, it, vi } from "vitest";
import { HandleProblemIncidentLinkUseCase } from "./handle-problem-incident-link.use-case";
import type { IIncidentRepository } from "../ports/incident-repository.port";

function createRepoMock(): IIncidentRepository {
  return {
    create: vi.fn(),
    findByExternalRef: vi.fn(),
    findById: vi.fn(),
    findByIdWithComments: vi.fn(),
    list: vi.fn(),
    updateStatus: vi.fn(),
    assign: vi.fn(),
    addComment: vi.fn(),
    addAttachment: vi.fn(),
    listAttachments: vi.fn(),
    setProblemLink: vi.fn(),
  } as unknown as IIncidentRepository;
}

describe("HandleProblemIncidentLinkUseCase", () => {
  it("sets incident.problemId on link event", async () => {
    const repo = createRepoMock();
    const useCase = new HandleProblemIncidentLinkUseCase(repo);

    const result = await useCase.link({
      problemId: "11111111-1111-4111-8111-111111111111",
      incidentId: "22222222-2222-4222-8222-222222222222",
      occurredAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
    expect(repo.setProblemLink).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111"
    );
  });

  it("clears incident.problemId on unlink event", async () => {
    const repo = createRepoMock();
    const useCase = new HandleProblemIncidentLinkUseCase(repo);

    const result = await useCase.unlink({
      problemId: "11111111-1111-4111-8111-111111111111",
      incidentId: "22222222-2222-4222-8222-222222222222",
      occurredAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
    expect(repo.setProblemLink).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      null
    );
  });
});
