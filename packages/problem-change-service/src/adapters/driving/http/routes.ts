import { Router, type RequestHandler } from "express";
import { requireJwtPermission } from "@pgic/shared";
import type { ProblemChangeController } from "./problem-change.controller";
import {
  validateIdParam,
  validateCreateProblem,
  validateCreateChange,
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
    "/problems/:id",
    authMiddleware,
    requireJwtPermission("problems", "read", "all"),
    validateIdParam,
    controller.getProblemHandler as RequestHandler
  );

  router.post(
    "/changes",
    authMiddleware,
    requireJwtPermission("changes", "create", "all"),
    validateCreateChange,
    controller.createChangeHandler as RequestHandler
  );
  router.get("/changes", authMiddleware, requireJwtPermission("changes", "read", "all"), controller.listChangesHandler as RequestHandler);
  router.get(
    "/changes/:id",
    authMiddleware,
    requireJwtPermission("changes", "read", "all"),
    validateIdParam,
    controller.getChangeHandler as RequestHandler
  );

  return router;
}
