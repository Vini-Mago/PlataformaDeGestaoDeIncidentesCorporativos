import { Router, type RequestHandler } from "express";
import { requireJwtPermission } from "@pgic/shared";
import type { ProblemChangeController } from "./problem-change.controller";
import {
  validateIdParam,
  validateCreateProblem,
  validateCreateChange,
  validateLinkIncidentBody,
  validateProblemIncidentParams,
  validateLinkedForIncidentsQuery,
  validateUpdateProblem,
  validateUpdateChange,
  validateLinkProblemToChangeBody,
  validateChangeProblemParams,
  validateListVersionsQuery,
} from "./validation";

export function createRoutes(
  controller: ProblemChangeController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/problems",
    authMiddleware,
    requireJwtPermission("problems", "create", "all"),
    validateCreateProblem,
    controller.createProblemHandler as RequestHandler
  );
  router.get("/problems", authMiddleware, requireJwtPermission("problems", "read", "all"), controller.listProblemsHandler as RequestHandler);
  router.get(
    "/problems/linked-for-incidents",
    authMiddleware,
    requireJwtPermission("problems", "read", "all"),
    validateLinkedForIncidentsQuery,
    controller.listLinkedForIncidentsHandler as RequestHandler
  );
  router.post(
    "/problems/:id/incidents",
    authMiddleware,
    requireJwtPermission("problems", "update", "all"),
    validateIdParam,
    validateLinkIncidentBody,
    controller.linkIncidentHandler as RequestHandler
  );
  router.delete(
    "/problems/:id/incidents/:incidentId",
    authMiddleware,
    requireJwtPermission("problems", "update", "all"),
    validateProblemIncidentParams,
    controller.unlinkIncidentHandler as RequestHandler
  );
  router.get(
    "/problems/:id",
    authMiddleware,
    requireJwtPermission("problems", "read", "all"),
    validateIdParam,
    controller.getProblemHandler as RequestHandler
  );
  router.patch(
    "/problems/:id",
    authMiddleware,
    requireJwtPermission("problems", "update", "all"),
    validateIdParam,
    validateUpdateProblem,
    controller.patchProblemHandler as RequestHandler
  );
  router.get(
    "/problems/:id/versions",
    authMiddleware,
    requireJwtPermission("problems", "read", "all"),
    validateIdParam,
    validateListVersionsQuery,
    controller.listProblemVersionsHandler as RequestHandler
  );

  router.post(
    "/changes",
    authMiddleware,
    requireJwtPermission("changes", "create", "all"),
    validateCreateChange,
    controller.createChangeHandler as RequestHandler
  );
  router.get("/changes", authMiddleware, requireJwtPermission("changes", "read", "all"), controller.listChangesHandler as RequestHandler);
  router.post(
    "/changes/:id/incidents",
    authMiddleware,
    requireJwtPermission("changes", "update", "all"),
    validateIdParam,
    validateLinkIncidentBody,
    controller.linkChangeIncidentHandler as RequestHandler
  );
  router.delete(
    "/changes/:id/incidents/:incidentId",
    authMiddleware,
    requireJwtPermission("changes", "update", "all"),
    validateProblemIncidentParams,
    controller.unlinkChangeIncidentHandler as RequestHandler
  );
  router.post(
    "/changes/:id/problems",
    authMiddleware,
    requireJwtPermission("changes", "update", "all"),
    validateIdParam,
    validateLinkProblemToChangeBody,
    controller.linkChangeProblemHandler as RequestHandler
  );
  router.delete(
    "/changes/:id/problems/:problemId",
    authMiddleware,
    requireJwtPermission("changes", "update", "all"),
    validateChangeProblemParams,
    controller.unlinkChangeProblemHandler as RequestHandler
  );
  router.patch(
    "/changes/:id",
    authMiddleware,
    requireJwtPermission("changes", "update", "all"),
    validateIdParam,
    validateUpdateChange,
    controller.patchChangeHandler as RequestHandler
  );
  router.get(
    "/changes/:id",
    authMiddleware,
    requireJwtPermission("changes", "read", "all"),
    validateIdParam,
    controller.getChangeHandler as RequestHandler
  );
  router.get(
    "/changes/:id/versions",
    authMiddleware,
    requireJwtPermission("changes", "read", "all"),
    validateIdParam,
    validateListVersionsQuery,
    controller.listChangeVersionsHandler as RequestHandler
  );

  return router;
}
