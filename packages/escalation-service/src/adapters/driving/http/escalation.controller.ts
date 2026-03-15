import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateEscalationRuleDto } from "../../../application/dtos/create-escalation-rule.dto";
import type { CreateEscalationRuleUseCase } from "../../../application/use-cases/create-escalation-rule.use-case";
import type { ListEscalationRulesUseCase } from "../../../application/use-cases/list-escalation-rules.use-case";
import type { GetEscalationRuleUseCase } from "../../../application/use-cases/get-escalation-rule.use-case";
import { parseTicketTypeFilterOrThrow } from "../../../application/use-cases/list-escalation-rules.use-case";
import { asyncHandler } from "@pgic/shared";

export class EscalationController {
  constructor(
    private readonly createEscalationRule: CreateEscalationRuleUseCase,
    private readonly listEscalationRules: ListEscalationRulesUseCase,
    private readonly getEscalationRule: GetEscalationRuleUseCase
  ) {}

  createEscalationRuleHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const rule = await this.createEscalationRule.execute(req.body as CreateEscalationRuleDto);
    res.status(201).json(rule);
  });

  listEscalationRulesHandler = asyncHandler(async (req: Request, res: Response) => {
    const ticketType = parseTicketTypeFilterOrThrow(req.query.ticketType);
    const isActive =
      req.query.isActive === undefined
        ? undefined
        : req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
            ? false
            : undefined;
    const list = await this.listEscalationRules.execute({ ticketType, isActive });
    res.json(list);
  });

  getEscalationRuleHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const rule = await this.getEscalationRule.execute(id);
    res.json(rule);
  });
}
