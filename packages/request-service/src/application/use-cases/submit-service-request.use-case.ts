import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import { ServiceRequestNotFoundError, InvalidStatusTransitionError } from "../errors";

const ALLOWED_SUBMIT_FROM: Set<string> = new Set(["Draft"]);

export class SubmitServiceRequestUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  async execute(requestId: string) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);
    if (!ALLOWED_SUBMIT_FROM.has(request.status)) {
      throw new InvalidStatusTransitionError(request.status, "Submitted");
    }
    const submittedAt = new Date();
    return this.requestRepository.updateStatus(requestId, "Submitted", { submittedAt });
  }
}
