import type { IProblemRepository } from "../ports/problem-repository.port";

export type IncidentProblemLinkRow = {
  incidentId: string;
  problemId: string;
  problemTitle: string;
};

export class ListIncidentProblemLinksUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(incidentIds: string[]): Promise<IncidentProblemLinkRow[]> {
    return this.problemRepository.listLinksForIncidents(incidentIds);
  }
}
