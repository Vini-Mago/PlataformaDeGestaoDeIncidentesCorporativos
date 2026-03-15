import { Router, type RequestHandler } from "express";
import type { ReportingController } from "./reporting.controller";
import { validateIdParam, validateCreateReportDefinition } from "./validation";

export function createRoutes(
  controller: ReportingController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/report-definitions",
    authMiddleware,
    validateCreateReportDefinition,
    controller.createReportDefinitionHandler as RequestHandler
  );
  router.get("/report-definitions", authMiddleware, controller.listReportDefinitionsHandler as RequestHandler);
  router.get("/report-definitions/:id", authMiddleware, validateIdParam, controller.getReportDefinitionHandler as RequestHandler);

  return router;
}
