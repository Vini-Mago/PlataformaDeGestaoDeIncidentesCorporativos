import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { AddRequestCommentDto } from "../dtos/add-request-comment.dto";
import { ServiceRequestNotFoundError } from "../errors";

export class AddRequestCommentUseCase {
  constructor(private readonly requestRepository: IServiceRequestRepository) {}

  async execute(requestId: string, authorId: string, dto: AddRequestCommentDto) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);
    return this.requestRepository.addComment(requestId, authorId, dto.body);
  }
}
