import type { IIncidentRepository } from "../ports/incident-repository.port";
import { IncidentNotFoundError } from "../errors";

export class AssignIncidentUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(
    id: string,
    assignedTeamId: string | null,
    assignedToId: string | null
  ) {
    const current = await this.incidentRepository.findById(id);
    if (!current) throw new IncidentNotFoundError(id);
    return this.incidentRepository.assign(
      id,
      assignedTeamId ?? current.assignedTeamId,
      assignedToId ?? current.assignedToId,
      true
    );
  }
}
