import type { IIncidentRepository } from "../ports/incident-repository.port";
import { IncidentNotFoundError, InvalidStatusTransitionError } from "../errors";
import { VALID_STATUSES } from "../../domain/entities/incident.entity";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Open: ["InAnalysis", "Resolved", "Closed"],
  InAnalysis: ["Open", "InProgress", "PendingCustomer", "Resolved", "Closed"],
  InProgress: ["Open", "InAnalysis", "PendingCustomer", "Resolved", "Closed"],
  PendingCustomer: ["Open", "InAnalysis", "InProgress", "Resolved", "Closed"],
  Resolved: ["Closed", "InProgress"],
  Closed: [],
};

export class ChangeIncidentStatusUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(
    id: string,
    toStatus: string,
    changedById: string | null,
    comment: string | null
  ) {
    if (!VALID_STATUSES.includes(toStatus as never)) {
      throw new InvalidStatusTransitionError("any", toStatus);
    }
    const current = await this.incidentRepository.findById(id);
    if (!current) throw new IncidentNotFoundError(id);
    const allowed = ALLOWED_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(toStatus)) {
      throw new InvalidStatusTransitionError(current.status, toStatus);
    }
    return this.incidentRepository.updateStatus(
      id,
      toStatus,
      changedById,
      comment,
      true
    );
  }
}
