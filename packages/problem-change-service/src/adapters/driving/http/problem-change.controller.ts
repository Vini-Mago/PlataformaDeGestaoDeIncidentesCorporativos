import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateProblemDto } from "../../../application/dtos/create-problem.dto";
import type { CreateChangeDto } from "../../../application/dtos/create-change.dto";
import type { LinkIncidentToProblemDto } from "../../../application/dtos/link-incident-to-problem.dto";
import type { UpdateProblemDto } from "../../../application/dtos/update-problem.dto";
import type { UpdateChangeDto } from "../../../application/dtos/update-change.dto";
import type { LinkProblemToChangeDto } from "../../../application/dtos/link-problem-to-change.dto";
import type { CreateProblemUseCase } from "../../../application/use-cases/create-problem.use-case";
import type { ListProblemsUseCase } from "../../../application/use-cases/list-problems.use-case";
import type { GetProblemUseCase } from "../../../application/use-cases/get-problem.use-case";
import type { CreateChangeUseCase } from "../../../application/use-cases/create-change.use-case";
import type { ListChangesUseCase } from "../../../application/use-cases/list-changes.use-case";
import type { GetChangeUseCase } from "../../../application/use-cases/get-change.use-case";
import type { LinkIncidentToProblemUseCase } from "../../../application/use-cases/link-incident-to-problem.use-case";
import type { UnlinkIncidentFromProblemUseCase } from "../../../application/use-cases/unlink-incident-from-problem.use-case";
import type { ListIncidentProblemLinksUseCase } from "../../../application/use-cases/list-incident-problem-links.use-case";
import type { UpdateProblemUseCase } from "../../../application/use-cases/update-problem.use-case";
import type { UpdateChangeUseCase } from "../../../application/use-cases/update-change.use-case";
import type { LinkIncidentToChangeUseCase } from "../../../application/use-cases/link-incident-to-change.use-case";
import type { UnlinkIncidentFromChangeUseCase } from "../../../application/use-cases/unlink-incident-from-change.use-case";
import type { LinkProblemToChangeUseCase } from "../../../application/use-cases/link-problem-to-change.use-case";
import type { UnlinkProblemFromChangeUseCase } from "../../../application/use-cases/unlink-problem-from-change.use-case";
import type { ListProblemVersionsUseCase } from "../../../application/use-cases/list-problem-versions.use-case";
import type { ListChangeVersionsUseCase } from "../../../application/use-cases/list-change-versions.use-case";
import {
  parseProblemStatusFilter,
  type ListProblemsInput,
} from "../../../application/use-cases/list-problems.use-case";
import {
  parseChangeStatusFilter,
  parseChangeRiskFilter,
  type ListChangesInput,
} from "../../../application/use-cases/list-changes.use-case";
import { asyncHandler } from "@pgic/shared";
import {
  canReadAllChanges,
  canReadAllProblems,
  canUpdateAllChanges,
  canUpdateAllProblems,
  isChangeOwner,
  isProblemOwner,
} from "./problem-change-access.helper";
import { ChangeForbiddenError, ProblemForbiddenError } from "../../../application/errors";

export class ProblemChangeController {
  constructor(
    private readonly createProblem: CreateProblemUseCase,
    private readonly listProblems: ListProblemsUseCase,
    private readonly getProblem: GetProblemUseCase,
    private readonly linkIncidentToProblem: LinkIncidentToProblemUseCase,
    private readonly unlinkIncidentFromProblem: UnlinkIncidentFromProblemUseCase,
    private readonly listIncidentProblemLinksUseCase: ListIncidentProblemLinksUseCase,
    private readonly updateProblem: UpdateProblemUseCase,
    private readonly createChange: CreateChangeUseCase,
    private readonly listChanges: ListChangesUseCase,
    private readonly getChange: GetChangeUseCase,
    private readonly updateChange: UpdateChangeUseCase,
    private readonly linkIncidentToChange: LinkIncidentToChangeUseCase,
    private readonly unlinkIncidentFromChange: UnlinkIncidentFromChangeUseCase,
    private readonly linkProblemToChange: LinkProblemToChangeUseCase,
    private readonly unlinkProblemFromChange: UnlinkProblemFromChangeUseCase,
    private readonly listProblemVersionsUseCase: ListProblemVersionsUseCase,
    private readonly listChangeVersionsUseCase: ListChangeVersionsUseCase
  ) {}

  createProblemHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const problem = await this.createProblem.execute(req.body as CreateProblemDto, userId);
    res.status(201).json(problem);
  });

  listLinkedForIncidentsHandler = asyncHandler(async (req: Request, res: Response) => {
    const ids = (req as Request & { validatedIncidentIds?: string[] }).validatedIncidentIds;
    if (!ids?.length) {
      res.status(400).json({ error: "Missing validated incident ids" });
      return;
    }
    const rows = await this.listIncidentProblemLinksUseCase.execute(ids);
    res.json(rows);
  });

  listProblemsHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let createdById = req.query.createdById as string | undefined;
    if (!canReadAllProblems(req)) {
      createdById = req.userId;
    }
    const input: ListProblemsInput = {
      status: parseProblemStatusFilter(req.query.status),
      createdById,
    };
    const list = await this.listProblems.execute(input);
    res.json(list);
  });

  patchProblemHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!canUpdateAllProblems(req)) {
      const current = await this.getProblem.execute(id);
      const uid = req.userId;
      if (!uid || !isProblemOwner(current, uid)) {
        throw new ProblemForbiddenError();
      }
    }
    const detail = await this.updateProblem.execute(id, req.body as UpdateProblemDto, req.userId);
    res.json(detail);
  });

  getProblemHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const problem = await this.getProblem.execute(id);
    if (!canReadAllProblems(req)) {
      const uid = req.userId;
      if (!uid || !isProblemOwner(problem, uid)) {
        throw new ProblemForbiddenError();
      }
    }
    res.json(problem);
  });

  listProblemVersionsHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!canReadAllProblems(req)) {
      const problem = await this.getProblem.execute(id);
      const uid = req.userId;
      if (!uid || !isProblemOwner(problem, uid)) {
        throw new ProblemForbiddenError();
      }
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const items = await this.listProblemVersionsUseCase.execute(id, Number.isFinite(limit) ? limit : 50);
    res.json({ items });
  });

  linkIncidentHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { incidentId } = req.body as LinkIncidentToProblemDto;
    await this.linkIncidentToProblem.execute(id, incidentId);
    res.status(204).send();
  });

  unlinkIncidentHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, incidentId } = req.params;
    await this.unlinkIncidentFromProblem.execute(id, incidentId);
    res.status(204).send();
  });

  createChangeHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const change = await this.createChange.execute(req.body as CreateChangeDto, userId);
    res.status(201).json(change);
  });

  listChangesHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let createdById = req.query.createdById as string | undefined;
    if (!canReadAllChanges(req)) {
      createdById = req.userId;
    }
    const input: ListChangesInput = {
      status: parseChangeStatusFilter(req.query.status),
      createdById,
      risk: parseChangeRiskFilter(req.query.risk),
    };
    const list = await this.listChanges.execute(input);
    res.json(list);
  });

  patchChangeHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!canUpdateAllChanges(req)) {
      const current = await this.getChange.execute(id);
      const uid = req.userId;
      if (!uid || !isChangeOwner(current, uid)) {
        throw new ChangeForbiddenError();
      }
    }
    const detail = await this.updateChange.execute(id, req.body as UpdateChangeDto, req.userId);
    res.json(detail);
  });

  linkChangeIncidentHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { incidentId } = req.body as LinkIncidentToProblemDto;
    await this.linkIncidentToChange.execute(id, incidentId);
    res.status(204).send();
  });

  unlinkChangeIncidentHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, incidentId } = req.params;
    await this.unlinkIncidentFromChange.execute(id, incidentId);
    res.status(204).send();
  });

  linkChangeProblemHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { problemId } = req.body as LinkProblemToChangeDto;
    await this.linkProblemToChange.execute(id, problemId);
    res.status(204).send();
  });

  unlinkChangeProblemHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, problemId } = req.params;
    await this.unlinkProblemFromChange.execute(id, problemId);
    res.status(204).send();
  });

  getChangeHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const change = await this.getChange.execute(id);
    if (!canReadAllChanges(req)) {
      const uid = req.userId;
      if (!uid || !isChangeOwner(change, uid)) {
        throw new ChangeForbiddenError();
      }
    }
    res.json(change);
  });

  listChangeVersionsHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!canReadAllChanges(req)) {
      const change = await this.getChange.execute(id);
      const uid = req.userId;
      if (!uid || !isChangeOwner(change, uid)) {
        throw new ChangeForbiddenError();
      }
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const items = await this.listChangeVersionsUseCase.execute(id, Number.isFinite(limit) ? limit : 50);
    res.json({ items });
  });
}
