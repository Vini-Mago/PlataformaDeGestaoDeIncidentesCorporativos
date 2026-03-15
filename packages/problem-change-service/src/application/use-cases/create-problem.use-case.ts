import type { IProblemRepository } from "../ports/problem-repository.port";
import type { CreateProblemDto } from "../dtos/create-problem.dto";

export class CreateProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(dto: CreateProblemDto, createdById: string) {
    return this.problemRepository.create({
      title: dto.title,
      description: dto.description,
      rootCause: dto.rootCause ?? null,
      actionPlan: dto.actionPlan ?? null,
      createdById,
      publishCreatedEvent: true,
    });
  }
}
