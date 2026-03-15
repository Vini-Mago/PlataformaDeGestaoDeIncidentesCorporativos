import { Router, type RequestHandler } from "express";
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
    validateCreateAuditEntry,
    controller.createAuditEntryHandler as RequestHandler
  );
  router.get("/audit-entries", authMiddleware, controller.listAuditEntriesHandler as RequestHandler);
  router.get("/audit-entries/:id", authMiddleware, validateIdParam, controller.getAuditEntryHandler as RequestHandler);

  return router;
}
