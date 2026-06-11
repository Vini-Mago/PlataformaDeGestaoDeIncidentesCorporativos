import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireJwtPermission } from "@pgic/shared";
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

  const webhookAuth = createWebhookAuthMiddleware(webhookConfig);

  router.post(
    "/webhooks/v1/monitoring",
    webhookLimiter,
    webhookAuth,
    controller.monitoringWebhook
  );

  router.get(
    "/webhooks/v1/incidents/:id",
    webhookLimiter,
    webhookAuth,
    controller.getIncident
  );

  router.get(
    "/webhooks/v1/incidents/external/:externalId",
    webhookLimiter,
    webhookAuth,
    controller.getIncidentByExternalId
  );

  router.patch(
    "/webhooks/v1/incidents/:id",
    webhookLimiter,
    webhookAuth,
    controller.updateIncident
  );

  router.patch(
    "/webhooks/v1/incidents/external/:externalId",
    webhookLimiter,
    webhookAuth,
    controller.updateIncidentByExternalId
  );

  router.post(
    "/outbound/v1/deliver",
    authMiddleware,
    controller.createOutbound
  );

  router.get(
    "/integration-logs",
    authMiddleware,
    requireJwtPermission("settings", "read", "all"),
    controller.listLogs
  );

  router.get(
    "/integration-dlq",
    authMiddleware,
    requireJwtPermission("settings", "read", "all"),
    controller.listDlq
  );

  router.post(
    "/integration-dlq/:id/reprocess",
    authMiddleware,
    requireJwtPermission("settings", "manage", "all"),
    controller.reprocessDlq
  );

  return router;
}
