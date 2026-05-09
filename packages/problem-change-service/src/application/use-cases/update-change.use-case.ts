import { canTransitionChangeStatus } from "../../domain/change-status-transition";
import { canEditChangeCoreFields, canEditChangeSchedulingFields } from "../../domain/change-edit-policy";
import { isWithinExecutionWindow } from "../../domain/change-execution-window";
import type { ChangeRisk, ChangeStatus, ChangeType } from "../../domain/entities/change.entity";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { UpdateChangeDto } from "../dtos/update-change.dto";
import {
  ChangeNotFoundError,
  InvalidChangeStatusTransitionError,
  ChangeExecutionOutsideWindowError,
  ChangeExecutionWindowRequiredError,
  ChangeContentLockedError,
  ChangeSchedulingLockedError,
} from "../errors";
import type { ChangeDetail } from "./get-change.use-case";

export interface UpdateChangeOptions {
  cabHighRiskPolicy: boolean;
  clock?: () => Date;
}

export class UpdateChangeUseCase {
  constructor(
    private readonly changeRepository: IChangeRepository,
    private readonly options: UpdateChangeOptions
  ) {}

  async execute(id: string, dto: UpdateChangeDto): Promise<ChangeDetail> {
    const current = await this.changeRepository.findById(id);
    if (!current) {
      throw new ChangeNotFoundError(id);
    }

    const cabPolicy = { cabHighRiskRequiresApprovalPath: this.options.cabHighRiskPolicy };
    const clock = this.options.clock ?? (() => new Date());

    if (
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.justification !== undefined ||
      dto.changeType !== undefined ||
      dto.risk !== undefined
    ) {
      if (!canEditChangeCoreFields(current.status)) {
        throw new ChangeContentLockedError();
      }
    }

    if (dto.windowStart !== undefined || dto.windowEnd !== undefined || dto.rollbackPlan !== undefined) {
      if (!canEditChangeSchedulingFields(current.status)) {
        throw new ChangeSchedulingLockedError();
      }
    }

    const mergedRisk = (dto.risk ?? current.risk) as ChangeRisk;

    let mergedStart = current.windowStart;
    let mergedEnd = current.windowEnd;
    if (dto.windowStart !== undefined) {
      mergedStart = dto.windowStart === null ? null : new Date(dto.windowStart);
    }
    if (dto.windowEnd !== undefined) {
      mergedEnd = dto.windowEnd === null ? null : new Date(dto.windowEnd);
    }

    if (dto.status !== undefined) {
      const nextStatus = dto.status as ChangeStatus;
      if (!canTransitionChangeStatus(current.status, nextStatus, mergedRisk, cabPolicy)) {
        throw new InvalidChangeStatusTransitionError(current.status, nextStatus);
      }
    }

    if (dto.status === "InProgress") {
      if (!mergedStart || !mergedEnd) {
        throw new ChangeExecutionWindowRequiredError();
      }
      if (!isWithinExecutionWindow(mergedStart, mergedEnd, clock())) {
        throw new ChangeExecutionOutsideWindowError();
      }
    }

    const updated = await this.changeRepository.update(id, {
      status: dto.status as ChangeStatus | undefined,
      title: dto.title,
      description: dto.description,
      justification: dto.justification,
      changeType: dto.changeType as ChangeType | undefined,
      risk: dto.risk as ChangeRisk | undefined,
      windowStart:
        dto.windowStart !== undefined ? (dto.windowStart === null ? null : new Date(dto.windowStart)) : undefined,
      windowEnd: dto.windowEnd !== undefined ? (dto.windowEnd === null ? null : new Date(dto.windowEnd)) : undefined,
      rollbackPlan: dto.rollbackPlan,
    });

    if (!updated) {
      throw new ChangeNotFoundError(id);
    }

    const [linkedIncidentIds, linkedProblemIds] = await Promise.all([
      this.changeRepository.getLinkedIncidentIds(id),
      this.changeRepository.getLinkedProblemIds(id),
    ]);

    return { ...updated, linkedIncidentIds, linkedProblemIds };
  }
}
