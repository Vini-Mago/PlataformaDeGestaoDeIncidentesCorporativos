import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

export class StartServiceRequestUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  execute(requestId: string, actorId: string) {
    return this.requestRepository.transition(requestId, {
      actorId,
      allowedFromStatuses: ["Approved"],
      toStatus: "InProgress",
    });
  }
}
