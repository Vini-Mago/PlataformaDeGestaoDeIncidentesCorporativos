import { canTransitionProblemStatus } from "../../domain/problem-status-transition";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { UpdateProblemDto } from "../dtos/update-problem.dto";
import { InvalidProblemStatusTransitionError, ProblemNotFoundError } from "../errors";
import type { ProblemDetail } from "./get-problem.use-case";

export class UpdateProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(id: string, dto: UpdateProblemDto): Promise<ProblemDetail> {
    const current = await this.problemRepository.findById(id);
    if (!current) {
      throw new ProblemNotFoundError(id);
    }

    if (dto.status !== undefined && !canTransitionProblemStatus(current.status, dto.status)) {
      throw new InvalidProblemStatusTransitionError(current.status, dto.status);
    }

    const updated = await this.problemRepository.update(id, {
      status: dto.status,
      rootCause: dto.rootCause,
      actionPlan: dto.actionPlan,
    });
    if (!updated) {
      throw new ProblemNotFoundError(id);
    }

    const linkedIncidentIds = await this.problemRepository.getLinkedIncidentIds(id);
    return { ...updated, linkedIncidentIds };
  }
}
