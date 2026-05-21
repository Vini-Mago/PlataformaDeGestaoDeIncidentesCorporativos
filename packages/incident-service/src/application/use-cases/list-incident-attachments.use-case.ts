import { IncidentNotFoundError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";

export class ListIncidentAttachmentsUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(incidentId: string) {
    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) throw new IncidentNotFoundError(incidentId);
    return this.incidentRepository.listAttachments(incidentId);
  }
}
