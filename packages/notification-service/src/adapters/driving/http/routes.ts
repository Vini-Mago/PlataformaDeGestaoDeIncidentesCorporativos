import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { NotificationController } from "./notification.controller";
import { validateIdParam, validateCreateNotification } from "./validation";

export function createRoutes(
  controller: NotificationController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  const readNotifications = requireAnyJwtPermission([
    { module: "notifications", action: "read", scope: "all" },
    { module: "notifications", action: "manage", scope: "all" },
  ]);

  router.post(
    "/notifications",
    authMiddleware,
    requireJwtPermission("notifications", "manage", "all"),
    validateCreateNotification,
    controller.createNotificationHandler as RequestHandler
  );
  router.get("/notifications", authMiddleware, readNotifications, controller.listNotificationsHandler as RequestHandler);
  router.get(
    "/notifications/:id",
    authMiddleware,
    readNotifications,
    validateIdParam,
    controller.getNotificationHandler as RequestHandler
  );

  return router;
}
