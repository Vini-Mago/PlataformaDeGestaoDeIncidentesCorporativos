import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { ReportingController } from "./reporting.controller";
import { validateIdParam, validateCreateReportDefinition } from "./validation";

export function createRoutes(
  controller: ReportingController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  const readReporting = requireAnyJwtPermission([
    { module: "reporting", action: "read", scope: "all" },
    { module: "reporting", action: "create", scope: "all" },
    { module: "reporting", action: "export", scope: "all" },
  ]);

  router.post(
    "/report-definitions",
    authMiddleware,
    requireJwtPermission("reporting", "create", "all"),
    validateCreateReportDefinition,
    controller.createReportDefinitionHandler as RequestHandler
  );
  router.get("/report-definitions", authMiddleware, readReporting, controller.listReportDefinitionsHandler as RequestHandler);
  router.get(
    "/report-definitions/:id",
    authMiddleware,
    readReporting,
    validateIdParam,
    controller.getReportDefinitionHandler as RequestHandler
  );

  return router;
}
