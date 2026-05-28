import { Router, type RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { ReportingController } from "./reporting.controller";
import { validateIdParam, validateCreateReportDefinition } from "./validation";
import { requireReportExportJobAccess } from "./report-export-access.helper";

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

  const accessExportJob = requireReportExportJobAccess();

  router.post(
    "/report-definitions",
    authMiddleware,
    requireJwtPermission("reporting", "create", "all"),
    validateCreateReportDefinition,
    controller.createReportDefinitionHandler as RequestHandler
  );
  router.get("/report-definitions", authMiddleware, readReporting, controller.listReportDefinitionsHandler as RequestHandler);
  router.get(
    "/report-definitions/export.csv",
    authMiddleware,
    requireJwtPermission("reporting", "export", "all"),
    controller.exportReportDefinitionsCsvHandler as RequestHandler
  );
  router.post(
    "/report-definitions/export-jobs",
    authMiddleware,
    requireJwtPermission("reporting", "export", "all"),
    controller.requestExportJobHandler as RequestHandler
  );
  router.get(
    "/report-definitions/export-jobs/:id",
    authMiddleware,
    accessExportJob,
    validateIdParam,
    controller.getExportJobHandler as RequestHandler
  );
  router.get(
    "/report-definitions/export-jobs/:id/download",
    authMiddleware,
    accessExportJob,
    validateIdParam,
    controller.downloadExportJobHandler as RequestHandler
  );
  router.get(
    "/report-definitions/:id",
    authMiddleware,
    readReporting,
    validateIdParam,
    controller.getReportDefinitionHandler as RequestHandler
  );

  return router;
}
