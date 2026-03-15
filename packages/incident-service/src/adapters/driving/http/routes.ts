import { Router, type RequestHandler } from "express";
import type { IncidentController } from "./incident.controller";
import {
  validateIdParam,
  validateCreateIncident,
  validateChangeIncidentStatus,
  validateAssignIncident,
  validateAddIncidentComment,
} from "./validation";

export function createRoutes(
  controller: IncidentController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post("/incidents", authMiddleware, validateCreateIncident, controller.create as RequestHandler);
  router.get("/incidents", authMiddleware, controller.list as RequestHandler);
  router.get("/incidents/:id", authMiddleware, validateIdParam, controller.getById as RequestHandler);
  router.patch("/incidents/:id/status", authMiddleware, validateIdParam, validateChangeIncidentStatus, controller.changeStatus as RequestHandler);
  router.patch("/incidents/:id/assign", authMiddleware, validateIdParam, validateAssignIncident, controller.assign as RequestHandler);
  router.post("/incidents/:id/comments", authMiddleware, validateIdParam, validateAddIncidentComment, controller.addComment as RequestHandler);

  return router;
}
