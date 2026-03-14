import { Router } from "express";
import type { CatalogItemController } from "./catalog-item.controller";
import type { ServiceRequestController } from "./service-request.controller";
import type { RequestHandler } from "express";
import {
  validateCreateCatalogItem,
  validateCreateServiceRequest,
  validateAddRequestComment,
} from "./validation";

export function createRoutes(
  catalogController: CatalogItemController,
  requestController: ServiceRequestController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  // Catalog items: list and get are public; create requires auth.
  router.get("/catalog-items", catalogController.list as RequestHandler);
  router.get("/catalog-items/:id", catalogController.getById as RequestHandler);
  router.post("/catalog-items", authMiddleware, validateCreateCatalogItem, catalogController.create as RequestHandler);

  // Service requests: create and addComment require auth.
  router.post("/service-requests", authMiddleware, validateCreateServiceRequest, requestController.create as RequestHandler);
  router.get("/service-requests", requestController.list as RequestHandler);
  router.get("/service-requests/:id", requestController.getById as RequestHandler);
  router.post("/service-requests/:id/submit", authMiddleware, requestController.submit as RequestHandler);
  router.post("/service-requests/:id/comments", authMiddleware, validateAddRequestComment, requestController.addComment as RequestHandler);

  return router;
}
