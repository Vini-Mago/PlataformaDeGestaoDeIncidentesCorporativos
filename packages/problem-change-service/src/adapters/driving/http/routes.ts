import { Router, type RequestHandler } from "express";
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

  router.post("/problems", authMiddleware, validateCreateProblem, controller.createProblemHandler as RequestHandler);
  router.get("/problems", authMiddleware, controller.listProblemsHandler as RequestHandler);
  router.get("/problems/:id", authMiddleware, validateIdParam, controller.getProblemHandler as RequestHandler);

  router.post("/changes", authMiddleware, validateCreateChange, controller.createChangeHandler as RequestHandler);
  router.get("/changes", authMiddleware, controller.listChangesHandler as RequestHandler);
  router.get("/changes/:id", authMiddleware, validateIdParam, controller.getChangeHandler as RequestHandler);

  return router;
}
