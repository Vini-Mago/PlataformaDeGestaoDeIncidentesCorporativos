import type { ISlaAssignmentRepository } from "../ports/sla-assignment-repository.port";

export class GetSlaAssignmentByTicketUseCase {
  constructor(private readonly slaAssignmentRepository: ISlaAssignmentRepository) {}

  async execute(ticketId: string, ticketType: string) {
    const assignment = await this.slaAssignmentRepository.findByTicket(ticketId, ticketType);
    if (!assignment) {
      return null;
    }
    return assignment;
  }
}
