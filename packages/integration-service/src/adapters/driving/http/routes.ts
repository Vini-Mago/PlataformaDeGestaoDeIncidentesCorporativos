import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { IntegrationController } from "./integration.controller";
import { createWebhookAuthMiddleware } from "./webhook-auth.middleware";

export function createRoutes(
  controller: IntegrationController,
  authMiddleware: ReturnType<typeof import("@pgic/shared").createAuthMiddleware>,
  webhookConfig: { apiKey: string; webhookSecret?: string; allowedIps?: string[] }
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

  router.post(
    "/outbound/v1/deliver",
    authMiddleware,
    controller.createOutbound
  );

  router.get(
    "/integration-logs",
    authMiddleware,
    controller.listLogs
  );

  router.get(
    "/integration-dlq",
    authMiddleware,
    controller.listDlq
  );

  router.post(
    "/integration-dlq/:id/reprocess",
    authMiddleware,
    controller.reprocessDlq
  );

  return router;
}
