import { Router, type RequestHandler } from "express";
import { requireJwtPermission } from "@pgic/shared";
import type { AuditController } from "./audit.controller";
import { validateIdParam, validateCreateAuditEntry } from "./validation";

export function createRoutes(
  controller: AuditController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/audit-entries",
    authMiddleware,
    requireJwtPermission("audit", "create", "all"),
    validateCreateAuditEntry,
    controller.createAuditEntryHandler as RequestHandler
  );
  router.get("/audit-entries", authMiddleware, requireJwtPermission("audit", "read", "all"), controller.listAuditEntriesHandler as RequestHandler);
  router.get(
    "/audit-entries/:id",
    authMiddleware,
    requireJwtPermission("audit", "read", "all"),
    validateIdParam,
    controller.getAuditEntryHandler as RequestHandler
  );

  return router;
}
