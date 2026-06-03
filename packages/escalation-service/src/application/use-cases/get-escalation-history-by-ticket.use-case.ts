import type { IEscalationHistoryRepository } from "../ports/escalation-history-repository.port";

export class GetEscalationHistoryByTicketUseCase {
  constructor(private readonly escalationHistoryRepository: IEscalationHistoryRepository) {}

  async execute(ticketId: string, ticketType: string) {
    return this.escalationHistoryRepository.findByTicket(ticketId, ticketType);
  }
}
