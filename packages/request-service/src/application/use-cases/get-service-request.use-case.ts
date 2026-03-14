import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import { ServiceRequestNotFoundError } from "../errors";

export class GetServiceRequestUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  async execute(id: string) {
    const request = await this.requestRepository.findById(id);
    if (!request) throw new ServiceRequestNotFoundError(id);
    return request;
  }
}
