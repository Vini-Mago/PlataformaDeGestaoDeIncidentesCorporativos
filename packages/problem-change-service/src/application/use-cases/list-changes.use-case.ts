import type { IChangeRepository } from "../ports/change-repository.port";
import type { ChangeStatus, ChangeRisk } from "../../domain/entities/change.entity";
import { InvalidChangeStatusFilterError, InvalidChangeRiskFilterError } from "../errors";

export interface ListChangesInput {
  status?: ChangeStatus;
  createdById?: string;
  risk?: ChangeRisk;
}

export class ListChangesUseCase {
  constructor(private readonly changeRepository: IChangeRepository) {}

  async execute(input: ListChangesInput) {
    return this.changeRepository.list({
      status: input.status,
      createdById: input.createdById,
      risk: input.risk,
    });
  }
}

export function parseChangeStatusFilter(value: unknown): ChangeStatus | undefined {
  if (value === undefined || value === "") return undefined;
  const valid: ChangeStatus[] = [
    "Draft",
    "Submitted",
    "InApproval",
    "Approved",
    "Rejected",
    "Scheduled",
    "InProgress",
    "Completed",
    "Rollback",
  ];
  if (typeof value !== "string" || !valid.includes(value as ChangeStatus)) {
    throw new InvalidChangeStatusFilterError(String(value));
  }
  return value as ChangeStatus;
}

export function parseChangeRiskFilter(value: unknown): ChangeRisk | undefined {
  if (value === undefined || value === "") return undefined;
  const valid: ChangeRisk[] = ["Low", "Medium", "High"];
  if (typeof value !== "string" || !valid.includes(value as ChangeRisk)) {
    throw new InvalidChangeRiskFilterError(String(value));
  }
  return value as ChangeRisk;
}
