import type { IIncidentRepository } from "../ports/incident-repository.port";
import { IncidentNotFoundError } from "../errors";

export class AddIncidentCommentUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(incidentId: string, authorId: string, body: string) {
    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) throw new IncidentNotFoundError(incidentId);
    return this.incidentRepository.addComment(incidentId, authorId, body);
  }
}
