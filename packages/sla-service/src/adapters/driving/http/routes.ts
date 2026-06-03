import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { SlaController } from "./sla.controller";
import {
  validateIdParam,
  validateCreateCalendar,
  validateCreateSlaPolicy,
} from "./validation";

export function createRoutes(
  controller: SlaController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  const readSla = requireAnyJwtPermission([
    { module: "sla", action: "read", scope: "all" },
    { module: "sla", action: "manage", scope: "all" },
  ]);

  router.post(
    "/calendars",
    authMiddleware,
    requireJwtPermission("sla", "manage", "all"),
    validateCreateCalendar,
    controller.createCalendarHandler as RequestHandler
  );
  router.get("/calendars", authMiddleware, readSla, controller.listCalendarsHandler as RequestHandler);
  router.get("/calendars/:id", authMiddleware, readSla, validateIdParam, controller.getCalendarHandler as RequestHandler);

  router.post(
    "/sla-policies",
    authMiddleware,
    requireJwtPermission("sla", "manage", "all"),
    validateCreateSlaPolicy,
    controller.createSlaPolicyHandler as RequestHandler
  );
  router.get("/sla-policies", authMiddleware, readSla, controller.listSlaPoliciesHandler as RequestHandler);
  router.get("/sla-policies/:id", authMiddleware, readSla, validateIdParam, controller.getSlaPolicyHandler as RequestHandler);

  router.get("/assignments/ticket/:ticketType/:ticketId", authMiddleware, readSla, controller.getSlaAssignmentHandler as RequestHandler);

  return router;
}
