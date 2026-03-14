import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import { ServiceRequestNotFoundError } from "../errors";

function toIso(date: Date): string {
  return date.toISOString();
}

export interface ServiceRequestWithComments {
  id: string;
  catalogItemId: string;
  requesterId: string;
  status: string;
  formData: Record<string, unknown> | null;
  assignedTeamId: string | null;
  assignedToId: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    requestId: string;
    authorId: string;
    body: string;
    createdAt: string;
  }>;
}

export class GetServiceRequestWithCommentsUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  async execute(id: string): Promise<ServiceRequestWithComments> {
    const request = await this.requestRepository.findById(id);
    if (!request) throw new ServiceRequestNotFoundError(id);

    const comments = await this.requestRepository.getComments(id);

    return {
      id: request.id,
      catalogItemId: request.catalogItemId,
      requesterId: request.requesterId,
      status: request.status,
      formData: request.formData,
      assignedTeamId: request.assignedTeamId,
      assignedToId: request.assignedToId,
      submittedAt: request.submittedAt ? toIso(request.submittedAt) : null,
      completedAt: request.completedAt ? toIso(request.completedAt) : null,
      createdAt: toIso(request.createdAt),
      updatedAt: toIso(request.updatedAt),
      comments: comments.map((c) => ({
        id: c.id,
        requestId: c.requestId,
        authorId: c.authorId,
        body: c.body,
        createdAt: toIso(c.createdAt),
      })),
    };
  }
}
