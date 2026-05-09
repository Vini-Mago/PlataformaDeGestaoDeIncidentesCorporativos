import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { EscalationController } from "./escalation.controller";
import { validateIdParam, validateCreateEscalationRule } from "./validation";

export function createRoutes(
  controller: EscalationController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  const readEscalation = requireAnyJwtPermission([
    { module: "escalation", action: "read", scope: "all" },
    { module: "escalation", action: "manage", scope: "all" },
  ]);

  router.post(
    "/escalation-rules",
    authMiddleware,
    requireJwtPermission("escalation", "manage", "all"),
    validateCreateEscalationRule,
    controller.createEscalationRuleHandler as RequestHandler
  );
  router.get("/escalation-rules", authMiddleware, readEscalation, controller.listEscalationRulesHandler as RequestHandler);
  router.get(
    "/escalation-rules/:id",
    authMiddleware,
    readEscalation,
    validateIdParam,
    controller.getEscalationRuleHandler as RequestHandler
  );

  return router;
}
