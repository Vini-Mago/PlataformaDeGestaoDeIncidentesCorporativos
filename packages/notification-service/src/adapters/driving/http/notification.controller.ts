import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateNotificationDto } from "../../../application/dtos/create-notification.dto";
import type { CreateNotificationUseCase } from "../../../application/use-cases/create-notification.use-case";
import type { ListNotificationsUseCase } from "../../../application/use-cases/list-notifications.use-case";
import type { GetNotificationUseCase } from "../../../application/use-cases/get-notification.use-case";
import { parseTypeFilterOrThrow } from "../../../application/use-cases/list-notifications.use-case";
import { asyncHandler } from "@pgic/shared";

export class NotificationController {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly getNotification: GetNotificationUseCase
  ) {}

  createNotificationHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notification = await this.createNotification.execute(req.body as CreateNotificationDto);
    res.status(201).json(notification);
  });

  listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
    const type = parseTypeFilterOrThrow(req.query.type);
    const recipient =
      typeof req.query.recipient === "string" && req.query.recipient.length > 0
        ? req.query.recipient
        : undefined;
    const list = await this.listNotifications.execute({ type, recipient });
    res.json(list);
  });

  getNotificationHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const notification = await this.getNotification.execute(id);
    res.json(notification);
  });
}
