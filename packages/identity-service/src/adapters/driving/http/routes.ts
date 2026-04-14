import { Router, Request, Response, NextFunction } from "express";
import { asyncHandler, requireOwnerOrAdmin } from "@pgic/shared";
import { UserController } from "./user.controller";
import {
  validateCreateUser,
  validateUpdateUser,
  validateStatusUpdate,
  validateImportUsers,
} from "./user.validation";

export function createUserRoutes(
  controller: UserController,
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void,
  requirePermission: (module: string, action: string, scope?: "own" | "team" | "all") => (req: Request, res: Response, next: NextFunction) => Promise<void>
): Router {
  const router = Router();
  router.post(
    "/users",
    validateCreateUser,
    authMiddleware,
    requirePermission("users", "create", "all"),
    asyncHandler(controller.create.bind(controller))
  );
  router.post(
    "/users/import",
    validateImportUsers,
    authMiddleware,
    requirePermission("users", "create", "all"),
    asyncHandler(controller.importUsers.bind(controller))
  );
  router.get(
    "/users/:id",
    authMiddleware,
    requirePermission("users", "read", "all"),
    asyncHandler(controller.getById.bind(controller))
  );
  router.patch(
    "/users/:id",
    validateUpdateUser,
    authMiddleware,
    requireOwnerOrAdmin("id"),
    asyncHandler(controller.update.bind(controller))
  );
  router.patch(
    "/users/:id/status",
    validateStatusUpdate,
    authMiddleware,
    requirePermission("users", "status", "all"),
    asyncHandler(controller.updateStatus.bind(controller))
  );
  return router;
}
