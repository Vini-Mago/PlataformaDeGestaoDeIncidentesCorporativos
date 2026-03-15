import type { Incident } from "../../domain/entities/incident.entity";
import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { IncidentListFilters } from "../ports/incident-repository.port";
import { InvalidStatusFilterError } from "../errors";
import { VALID_STATUSES } from "../../domain/entities/incident.entity";

export class ListIncidentsUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(filters: IncidentListFilters): Promise<Incident[]> {
    if (filters.status !== undefined && !VALID_STATUSES.includes(filters.status as never)) {
      throw new InvalidStatusFilterError(filters.status);
    }
    return this.incidentRepository.list(filters);
  }
}
