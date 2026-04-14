import { Router, Request, Response, NextFunction } from "express";
import { asyncHandler } from "@pgic/shared";
import { z } from "zod";
import { createValidateBody } from "@pgic/shared";
import { RbacController } from "./rbac.controller";

const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).default([]),
});

const updateUserOverridesSchema = z.object({
  overrides: z
    .array(
      z.object({
        permissionId: z.string().uuid(),
        granted: z.boolean(),
      })
    )
    .default([]),
});

export function createRbacRoutes(
  controller: RbacController,
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void,
  requirePermission: (module: string, action: string, scope?: "own" | "team" | "all") => (req: Request, res: Response, next: NextFunction) => Promise<void>
): Router {
  const router = Router();

  router.get(
    "/roles",
    authMiddleware,
    requirePermission("roles", "manage", "all"),
    asyncHandler(controller.listRoles.bind(controller))
  );
  router.get(
    "/permissions",
    authMiddleware,
    requirePermission("roles", "manage", "all"),
    asyncHandler(controller.listPermissions.bind(controller))
  );
  router.put(
    "/roles/:roleName/permissions",
    createValidateBody(updateRolePermissionsSchema),
    authMiddleware,
    requirePermission("roles", "manage", "all"),
    asyncHandler(controller.updateRolePermissions.bind(controller))
  );
  router.put(
    "/users/:id/permission-overrides",
    createValidateBody(updateUserOverridesSchema),
    authMiddleware,
    requirePermission("roles", "manage", "all"),
    asyncHandler(controller.updateUserPermissionOverrides.bind(controller))
  );
  router.get(
    "/access-logs",
    authMiddleware,
    requirePermission("access_logs", "read", "all"),
    asyncHandler(controller.listAccessLogs.bind(controller))
  );

  return router;
}
