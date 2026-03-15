import { Router, type RequestHandler } from "express";
import type { NotificationController } from "./notification.controller";
import { validateIdParam, validateCreateNotification } from "./validation";

export function createRoutes(
  controller: NotificationController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/notifications",
    authMiddleware,
    validateCreateNotification,
    controller.createNotificationHandler as RequestHandler
  );
  router.get("/notifications", authMiddleware, controller.listNotificationsHandler as RequestHandler);
  router.get("/notifications/:id", authMiddleware, validateIdParam, controller.getNotificationHandler as RequestHandler);

  return router;
}
