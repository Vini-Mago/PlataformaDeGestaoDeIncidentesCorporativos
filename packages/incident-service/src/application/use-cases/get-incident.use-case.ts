import type { IIncidentRepository } from "../ports/incident-repository.port";
import { IncidentNotFoundError } from "../errors";

export class GetIncidentUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(id: string) {
    const incident = await this.incidentRepository.findByIdWithComments(id);
    if (!incident) throw new IncidentNotFoundError(id);
    return incident;
  }
}
