import { Router, type RequestHandler } from "express";
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

  router.post("/calendars", authMiddleware, validateCreateCalendar, controller.createCalendarHandler as RequestHandler);
  router.get("/calendars", authMiddleware, controller.listCalendarsHandler as RequestHandler);
  router.get("/calendars/:id", authMiddleware, validateIdParam, controller.getCalendarHandler as RequestHandler);

  router.post("/sla-policies", authMiddleware, validateCreateSlaPolicy, controller.createSlaPolicyHandler as RequestHandler);
  router.get("/sla-policies", authMiddleware, controller.listSlaPoliciesHandler as RequestHandler);
  router.get("/sla-policies/:id", authMiddleware, validateIdParam, controller.getSlaPolicyHandler as RequestHandler);

  return router;
}
