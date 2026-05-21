import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { IntegrationController } from "./integration.controller";
import { createWebhookAuthMiddleware } from "./webhook-auth.middleware";

export function createRoutes(
  controller: IntegrationController,
  authMiddleware: ReturnType<typeof import("@pgic/shared").createAuthMiddleware>,
  webhookConfig: { apiKey: string; webhookSecret?: string }
) {
  const router = Router();

  const webhookLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post(
    "/webhooks/v1/monitoring",
    webhookLimiter,
    createWebhookAuthMiddleware(webhookConfig),
    controller.monitoringWebhook
  );

  router.get(
    "/integration-logs",
    authMiddleware,
    controller.listLogs
  );

  return router;
}
