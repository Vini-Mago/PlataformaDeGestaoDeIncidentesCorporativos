import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

export class CompleteServiceRequestUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  execute(requestId: string, actorId: string) {
    const completedAt = new Date();
    return this.requestRepository.transition(requestId, {
      actorId,
      allowedFromStatuses: ["InProgress"],
      toStatus: "Completed",
      completedAt,
    });
  }
}
