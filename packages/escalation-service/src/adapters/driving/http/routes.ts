import { Router, type RequestHandler } from "express";
import type { EscalationController } from "./escalation.controller";
import { validateIdParam, validateCreateEscalationRule } from "./validation";

export function createRoutes(
  controller: EscalationController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/escalation-rules",
    authMiddleware,
    validateCreateEscalationRule,
    controller.createEscalationRuleHandler as RequestHandler
  );
  router.get("/escalation-rules", authMiddleware, controller.listEscalationRulesHandler as RequestHandler);
  router.get("/escalation-rules/:id", authMiddleware, validateIdParam, controller.getEscalationRuleHandler as RequestHandler);

  return router;
}
