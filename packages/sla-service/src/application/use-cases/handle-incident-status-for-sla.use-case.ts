import type { ISlaAssignmentRepository } from "../ports/sla-assignment-repository.port";

export interface IncidentStatusChangedSlaPayload {
  incidentId: string;
  toStatus: string;
}

const PAUSE_STATUSES = new Set(["PendingCustomer"]);

export class HandleIncidentStatusForSlaUseCase {
  constructor(private readonly slaAssignmentRepository: ISlaAssignmentRepository) {}

  async execute(payload: IncidentStatusChangedSlaPayload): Promise<void> {
    const assignment = await this.slaAssignmentRepository.findByTicket(
      payload.incidentId,
      "incident"
    );
    if (!assignment) return;

    if (PAUSE_STATUSES.has(payload.toStatus)) {
      await this.slaAssignmentRepository.setStatus(
        payload.incidentId,
        "incident",
        "paused"
      );
      return;
    }

    if (assignment.status === "paused") {
      await this.slaAssignmentRepository.setStatus(
        payload.incidentId,
        "incident",
        "active"
      );
    }

    if (payload.toStatus === "Closed" || payload.toStatus === "Resolved") {
      await this.slaAssignmentRepository.setStatus(
        payload.incidentId,
        "incident",
        "completed"
      );
    }
  }
}
