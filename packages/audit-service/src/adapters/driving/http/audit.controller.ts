import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateAuditEntryDto } from "../../../application/dtos/create-audit-entry.dto";
import type { CreateAuditEntryUseCase } from "../../../application/use-cases/create-audit-entry.use-case";
import type { ListAuditEntriesUseCase } from "../../../application/use-cases/list-audit-entries.use-case";
import type { GetAuditEntryUseCase } from "../../../application/use-cases/get-audit-entry.use-case";
import { asyncHandler } from "@pgic/shared";

export class AuditController {
  constructor(
    private readonly createAuditEntry: CreateAuditEntryUseCase,
    private readonly listAuditEntries: ListAuditEntriesUseCase,
    private readonly getAuditEntry: GetAuditEntryUseCase
  ) {}

  createAuditEntryHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const entry = await this.createAuditEntry.execute(req.body as CreateAuditEntryDto);
    res.status(201).json(entry);
  });

  listAuditEntriesHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const resourceType = typeof req.query.resourceType === "string" ? req.query.resourceType : undefined;
    const resourceId = typeof req.query.resourceId === "string" ? req.query.resourceId : undefined;
    const defaultLimit = 100;
    const maxLimit = 500;
    const limitRaw = req.query.limit;
    const limit =
      limitRaw === undefined
        ? defaultLimit
        : Math.min(maxLimit, Math.max(1, parseInt(String(limitRaw), 10) || defaultLimit));
    const offsetRaw = req.query.offset;
    const offset = offsetRaw === undefined ? 0 : Math.max(0, parseInt(String(offsetRaw), 10) || 0);
    const list = await this.listAuditEntries.execute({ userId, resourceType, resourceId, limit, offset });
    res.json(list);
  });

  getAuditEntryHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const entry = await this.getAuditEntry.execute(id);
    res.json(entry);
  });
}
