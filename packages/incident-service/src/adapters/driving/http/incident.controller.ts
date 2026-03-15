import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateIncidentDto } from "../../../application/dtos/create-incident.dto";
import type { ChangeIncidentStatusDto } from "../../../application/dtos/change-incident-status.dto";
import type { AssignIncidentDto } from "../../../application/dtos/assign-incident.dto";
import type { AddIncidentCommentDto } from "../../../application/dtos/add-incident-comment.dto";
import type { CreateIncidentUseCase } from "../../../application/use-cases/create-incident.use-case";
import type { ListIncidentsUseCase } from "../../../application/use-cases/list-incidents.use-case";
import type { GetIncidentUseCase } from "../../../application/use-cases/get-incident.use-case";
import type { ChangeIncidentStatusUseCase } from "../../../application/use-cases/change-incident-status.use-case";
import type { AssignIncidentUseCase } from "../../../application/use-cases/assign-incident.use-case";
import type { AddIncidentCommentUseCase } from "../../../application/use-cases/add-incident-comment.use-case";
import { InvalidStatusFilterError } from "../../../application/errors";
import { asyncHandler } from "@pgic/shared";
import type { IncidentStatus } from "../../../domain/entities/incident.entity";

const VALID_STATUSES: IncidentStatus[] = [
  "Open",
  "InAnalysis",
  "InProgress",
  "PendingCustomer",
  "Resolved",
  "Closed",
];

function parseStatusFilter(value: unknown): IncidentStatus | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !VALID_STATUSES.includes(value as IncidentStatus)) {
    throw new InvalidStatusFilterError(String(value));
  }
  return value as IncidentStatus;
}

export class IncidentController {
  constructor(
    private readonly createIncident: CreateIncidentUseCase,
    private readonly listIncidents: ListIncidentsUseCase,
    private readonly getIncident: GetIncidentUseCase,
    private readonly changeIncidentStatus: ChangeIncidentStatusUseCase,
    private readonly assignIncident: AssignIncidentUseCase,
    private readonly addIncidentComment: AddIncidentCommentUseCase
  ) {}

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const incident = await this.createIncident.execute(
      req.body as CreateIncidentDto,
      userId
    );
    res.status(201).json(incident);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const requesterId = req.query.requesterId as string | undefined;
    const status = parseStatusFilter(req.query.status);
    const assignedToId = req.query.assignedToId as string | undefined;
    const assignedTeamId = req.query.assignedTeamId as string | undefined;
    const list = await this.listIncidents.execute({
      requesterId,
      status,
      assignedToId,
      assignedTeamId,
    });
    res.json(list);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const incident = await this.getIncident.execute(id);
    res.json(incident);
  });

  changeStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { toStatus, comment } = req.body as ChangeIncidentStatusDto;
    const incident = await this.changeIncidentStatus.execute(
      id,
      toStatus,
      req.userId ?? null,
      comment ?? null
    );
    res.json(incident);
  });

  assign = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assignedTeamId, assignedToId } = req.body as AssignIncidentDto;
    const incident = await this.assignIncident.execute(
      id,
      assignedTeamId ?? null,
      assignedToId ?? null
    );
    res.json(incident);
  });

  addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const { id } = req.params;
    const comment = await this.addIncidentComment.execute(
      id,
      userId,
      (req.body as AddIncidentCommentDto).body
    );
    res.status(201).json(comment);
  });
}
