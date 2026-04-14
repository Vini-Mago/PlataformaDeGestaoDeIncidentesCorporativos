import { Request, Response, NextFunction } from "express";
import { sendError } from "@pgic/shared";
import type { IAuthorizationRepository } from "../../../application/ports/authorization-repository.port";

export function createRequirePermission(authorizationRepository: IAuthorizationRepository) {
  return (module: string, action: string, scope: "own" | "team" | "all" = "all") => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.userId) {
        sendError(res, 401, "Unauthorized");
        return;
      }
      if (req.userRole === "admin") {
        next();
        return;
      }

      const rolePermissions = await authorizationRepository.getRolePermissions(req.userRole ?? "user");
      const permissionKey = (permission: { module: string; action: string; scope: string }) =>
        `${permission.module}:${permission.action}:${permission.scope}`;
      const effective = new Set(rolePermissions.map(permissionKey));

      const overrides = await authorizationRepository.getUserPermissionOverrides(req.userId);
      if (overrides.length > 0) {
        const overridePermissions = await authorizationRepository.getPermissionsByIds(
          overrides.map((override) => override.permissionId)
        );
        const byId = new Map(overridePermissions.map((permission) => [permission.id, permission]));
        for (const override of overrides) {
          const permission = byId.get(override.permissionId);
          if (!permission) continue;
          const key = permissionKey(permission);
          if (override.granted) {
            effective.add(key);
          } else {
            effective.delete(key);
          }
        }
      }

      const matched = effective.has(`${module}:${action}:${scope}`) || effective.has(`${module}:${action}:all`);
      if (!matched) {
        sendError(res, 403, "Forbidden");
        return;
      }
      next();
    };
  };
}
