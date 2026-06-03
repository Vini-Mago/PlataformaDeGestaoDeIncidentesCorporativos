import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
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
  const readProblems = requireAnyJwtPermission([
    { module: "problems", action: "read", scope: "all" },
    { module: "problems", action: "read", scope: "own" },
  ]);
  const readChanges = requireAnyJwtPermission([
    { module: "changes", action: "read", scope: "all" },
    { module: "changes", action: "read", scope: "own" },
  ]);

  router.post(
    "/problems",
    authMiddleware,
    requireJwtPermission("problems", "create", "all"),
    validateCreateProblem,
    controller.createProblemHandler as RequestHandler
  );
  router.get("/problems", authMiddleware, readProblems, controller.listProblemsHandler as RequestHandler);
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
    readProblems,
    validateIdParam,
    controller.getProblemHandler as RequestHandler
  );
  router.patch(
    "/problems/:id",
    authMiddleware,
    requireAnyJwtPermission([
      { module: "problems", action: "update", scope: "all" },
      { module: "problems", action: "update", scope: "own" },
    ]),
    validateIdParam,
    validateUpdateProblem,
    controller.patchProblemHandler as RequestHandler
  );
  router.get(
    "/problems/:id/versions",
    authMiddleware,
    readProblems,
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
  router.get("/changes", authMiddleware, readChanges, controller.listChangesHandler as RequestHandler);
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
    requireAnyJwtPermission([
      { module: "changes", action: "update", scope: "all" },
      { module: "changes", action: "update", scope: "own" },
    ]),
    validateIdParam,
    validateUpdateChange,
    controller.patchChangeHandler as RequestHandler
  );
  router.get(
    "/changes/:id",
    authMiddleware,
    readChanges,
    validateIdParam,
    controller.getChangeHandler as RequestHandler
  );
  router.get(
    "/changes/:id/versions",
    authMiddleware,
    readChanges,
    validateIdParam,
    validateListVersionsQuery,
    controller.listChangeVersionsHandler as RequestHandler
  );

  return router;
}
