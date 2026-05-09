import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
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

  const readIncident = requireAnyJwtPermission([
    { module: "incidents", action: "read", scope: "all" },
    { module: "incidents", action: "read", scope: "own" },
  ]);
  const updateIncident = requireAnyJwtPermission([
    { module: "incidents", action: "update", scope: "all" },
    { module: "incidents", action: "update", scope: "own" },
  ]);

  router.post(
    "/incidents",
    authMiddleware,
    requireJwtPermission("incidents", "create", "all"),
    validateCreateIncident,
    controller.create as RequestHandler
  );
  router.get("/incidents", authMiddleware, readIncident, controller.list as RequestHandler);
  router.get("/incidents/:id", authMiddleware, readIncident, validateIdParam, controller.getById as RequestHandler);
  router.patch(
    "/incidents/:id/status",
    authMiddleware,
    updateIncident,
    validateIdParam,
    validateChangeIncidentStatus,
    controller.changeStatus as RequestHandler
  );
  router.patch(
    "/incidents/:id/assign",
    authMiddleware,
    requireJwtPermission("incidents", "assign", "all"),
    validateIdParam,
    validateAssignIncident,
    controller.assign as RequestHandler
  );
  router.post(
    "/incidents/:id/comments",
    authMiddleware,
    updateIncident,
    validateIdParam,
    validateAddIncidentComment,
    controller.addComment as RequestHandler
  );

  return router;
}
