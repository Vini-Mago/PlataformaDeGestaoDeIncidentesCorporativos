import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateNotificationUseCase } from "../../../application/use-cases/create-notification.use-case";
import type { ListNotificationsUseCase } from "../../../application/use-cases/list-notifications.use-case";
import type { GetNotificationUseCase } from "../../../application/use-cases/get-notification.use-case";
import { parseTypeFilterOrThrow } from "../../../application/use-cases/list-notifications.use-case";
import { asyncHandler } from "@pgic/shared";
import { createNotificationSchema } from "../../../application/dtos/create-notification.dto";

export class NotificationController {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly getNotification: GetNotificationUseCase
  ) {}

  createNotificationHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation error",
        message: parsed.error.errors.map((e) => e.message).join("; "),
      });
      return;
    }
    const notification = await this.createNotification.execute(parsed.data, req.userId);
    res.status(201).json(notification);
  });

  listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
    const type = parseTypeFilterOrThrow(req.query.type);
    const recipient =
      typeof req.query.recipient === "string" && req.query.recipient.length > 0
        ? req.query.recipient
        : undefined;
    const defaultLimit = 100;
    const maxLimit = 500;
    const limitRaw = req.query.limit;
    const limit =
      limitRaw === undefined
        ? defaultLimit
        : Math.min(maxLimit, Math.max(1, parseInt(String(limitRaw), 10) || defaultLimit));
    const offsetRaw = req.query.offset;
    const offset = offsetRaw === undefined ? 0 : Math.max(0, parseInt(String(offsetRaw), 10) || 0);
    const list = await this.listNotifications.execute({ type, recipient, limit, offset });
    res.json(list);
  });

  getNotificationHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const notification = await this.getNotification.execute(id);
    res.json(notification);
  });
}
