import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateCalendarDto } from "../../../application/dtos/create-calendar.dto";
import type { CreateSlaPolicyDto } from "../../../application/dtos/create-sla-policy.dto";
import type { CreateCalendarUseCase } from "../../../application/use-cases/create-calendar.use-case";
import type { ListCalendarsUseCase } from "../../../application/use-cases/list-calendars.use-case";
import type { GetCalendarUseCase } from "../../../application/use-cases/get-calendar.use-case";
import type { CreateSlaPolicyUseCase } from "../../../application/use-cases/create-sla-policy.use-case";
import type { ListSlaPoliciesUseCase } from "../../../application/use-cases/list-sla-policies.use-case";
import type { GetSlaPolicyUseCase } from "../../../application/use-cases/get-sla-policy.use-case";
import { parseTicketTypeFilter } from "../../../application/use-cases/list-sla-policies.use-case";
import { asyncHandler } from "@pgic/shared";

export class SlaController {
  constructor(
    private readonly createCalendar: CreateCalendarUseCase,
    private readonly listCalendars: ListCalendarsUseCase,
    private readonly getCalendar: GetCalendarUseCase,
    private readonly createSlaPolicy: CreateSlaPolicyUseCase,
    private readonly listSlaPolicies: ListSlaPoliciesUseCase,
    private readonly getSlaPolicy: GetSlaPolicyUseCase
  ) {}

  createCalendarHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const calendar = await this.createCalendar.execute(req.body as CreateCalendarDto);
    res.status(201).json(calendar);
  });

  listCalendarsHandler = asyncHandler(async (_req: Request, res: Response) => {
    const list = await this.listCalendars.execute();
    res.json(list);
  });

  getCalendarHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const calendar = await this.getCalendar.execute(id);
    res.json(calendar);
  });

  createSlaPolicyHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const policy = await this.createSlaPolicy.execute(req.body as CreateSlaPolicyDto);
    res.status(201).json(policy);
  });

  listSlaPoliciesHandler = asyncHandler(async (req: Request, res: Response) => {
    const ticketType = parseTicketTypeFilter(req.query.ticketType);
    const isActive =
      req.query.isActive === undefined
        ? undefined
        : req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
            ? false
            : undefined;
    const list = await this.listSlaPolicies.execute({ ticketType, isActive });
    res.json(list);
  });

  getSlaPolicyHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const policy = await this.getSlaPolicy.execute(id);
    res.json(policy);
  });
}
