import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { ServiceRequestStatus } from "../../domain/entities/service-request.entity";

export interface ListServiceRequestsQuery {
  requesterId?: string;
  status?: ServiceRequestStatus;
  catalogItemId?: string;
}

export class ListServiceRequestsUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  async execute(query: ListServiceRequestsQuery = {}) {
    return this.requestRepository.list({
      requesterId: query.requesterId,
      status: query.status,
      catalogItemId: query.catalogItemId,
    });
  }
}
