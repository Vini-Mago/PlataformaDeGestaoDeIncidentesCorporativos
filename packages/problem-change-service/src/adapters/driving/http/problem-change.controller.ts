import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateProblemDto } from "../../../application/dtos/create-problem.dto";
import type { CreateChangeDto } from "../../../application/dtos/create-change.dto";
import type { CreateProblemUseCase } from "../../../application/use-cases/create-problem.use-case";
import type { ListProblemsUseCase } from "../../../application/use-cases/list-problems.use-case";
import type { GetProblemUseCase } from "../../../application/use-cases/get-problem.use-case";
import type { CreateChangeUseCase } from "../../../application/use-cases/create-change.use-case";
import type { ListChangesUseCase } from "../../../application/use-cases/list-changes.use-case";
import type { GetChangeUseCase } from "../../../application/use-cases/get-change.use-case";
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

export class ProblemChangeController {
  constructor(
    private readonly createProblem: CreateProblemUseCase,
    private readonly listProblems: ListProblemsUseCase,
    private readonly getProblem: GetProblemUseCase,
    private readonly createChange: CreateChangeUseCase,
    private readonly listChanges: ListChangesUseCase,
    private readonly getChange: GetChangeUseCase
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

  listProblemsHandler = asyncHandler(async (req: Request, res: Response) => {
    const input: ListProblemsInput = {
      status: parseProblemStatusFilter(req.query.status),
      createdById: req.query.createdById as string | undefined,
    };
    const list = await this.listProblems.execute(input);
    res.json(list);
  });

  getProblemHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const problem = await this.getProblem.execute(id);
    res.json(problem);
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

  listChangesHandler = asyncHandler(async (req: Request, res: Response) => {
    const input: ListChangesInput = {
      status: parseChangeStatusFilter(req.query.status),
      createdById: req.query.createdById as string | undefined,
      risk: parseChangeRiskFilter(req.query.risk),
    };
    const list = await this.listChanges.execute(input);
    res.json(list);
  });

  getChangeHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const change = await this.getChange.execute(id);
    res.json(change);
  });
}
