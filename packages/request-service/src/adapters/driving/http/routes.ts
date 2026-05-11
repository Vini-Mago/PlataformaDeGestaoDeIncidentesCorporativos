import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAnyJwtPermission, requireJwtPermission } from "@pgic/shared";
import type { CatalogItemController } from "./catalog-item.controller";
import type { ServiceRequestController } from "./service-request.controller";
import {
  validateCreateCatalogItem,
  validateCreateServiceRequest,
  validateAddRequestComment,
  validateRejectServiceRequest,
} from "./validation";

export function createRoutes(
  catalogController: CatalogItemController,
  requestController: ServiceRequestController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  const readRequest = requireAnyJwtPermission([
    { module: "requests", action: "read", scope: "all" },
    { module: "requests", action: "read", scope: "own" },
  ]);
  const updateRequest = requireAnyJwtPermission([
    { module: "requests", action: "update", scope: "all" },
    { module: "requests", action: "update", scope: "own" },
  ]);

  // Catalog items: list and get are public; create requires auth.
  router.get("/catalog-items", catalogController.list as RequestHandler);
  router.get("/catalog-items/:id", catalogController.getById as RequestHandler);
  router.post(
    "/catalog-items",
    authMiddleware,
    requireJwtPermission("requests", "create", "all"),
    validateCreateCatalogItem,
    catalogController.create as RequestHandler
  );

  router.post(
    "/service-requests",
    authMiddleware,
    requireJwtPermission("requests", "create", "all"),
    validateCreateServiceRequest,
    requestController.create as RequestHandler
  );
  router.get("/service-requests", authMiddleware, readRequest, requestController.list as RequestHandler);
  router.get("/service-requests/:id", authMiddleware, readRequest, requestController.getById as RequestHandler);
  router.post("/service-requests/:id/submit", authMiddleware, updateRequest, requestController.submit as RequestHandler);
  router.post(
    "/service-requests/:id/send-for-approval",
    authMiddleware,
    updateRequest,
    requestController.sendForApproval as RequestHandler
  );
  router.post(
    "/service-requests/:id/approve",
    authMiddleware,
    requireJwtPermission("requests", "approve", "all"),
    requestController.approve as RequestHandler
  );
  router.post(
    "/service-requests/:id/reject",
    authMiddleware,
    requireJwtPermission("requests", "approve", "all"),
    validateRejectServiceRequest,
    requestController.reject as RequestHandler
  );
  router.post(
    "/service-requests/:id/start",
    authMiddleware,
    requireJwtPermission("requests", "update", "all"),
    requestController.start as RequestHandler
  );
  router.post(
    "/service-requests/:id/complete",
    authMiddleware,
    requireJwtPermission("requests", "update", "all"),
    requestController.complete as RequestHandler
  );
  router.post(
    "/service-requests/:id/comments",
    authMiddleware,
    updateRequest,
    validateAddRequestComment,
    requestController.addComment as RequestHandler
  );

  return router;
}
