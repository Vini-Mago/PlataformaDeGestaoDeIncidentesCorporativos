import { Request, Response, NextFunction } from "express";
import { sendError } from "./send-error";

export type PermissionScope = "own" | "team" | "all";

/**
 * Verifica se o conjunto de chaves inclui a permissão pedida ou o wildcard `module:action:all`.
 */
export function matchesJwtPermission(
  keys: Set<string> | undefined,
  module: string,
  action: string,
  scope: PermissionScope = "all"
): boolean {
  if (!keys || keys.size === 0) {
    return false;
  }
  return keys.has(`${module}:${action}:${scope}`) || keys.has(`${module}:${action}:all`);
}

export type JwtPermissionAlternative = { module: string; action: string; scope: PermissionScope };

/**
 * Middleware: exige uma permissão RBAC no JWT (`perms`). Usar após `createAuthMiddleware`.
 * Utilizadores com `role === admin` passam sempre.
 */
export function requireJwtPermission(
  module: string,
  action: string,
  scope: PermissionScope = "all"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      sendError(res, 401, "Unauthorized");
      return;
    }
    if (req.userRole === "admin") {
      next();
      return;
    }
    const keys = req.permissionKeys;
    if (!matchesJwtPermission(keys, module, action, scope)) {
      sendError(res, 403, "Forbidden");
      return;
    }
    next();
  };
}

/**
 * Middleware: passa se qualquer uma das alternativas de permissão for satisfeita (útil para read:all | read:own).
 */
export function requireAnyJwtPermission(
  alternatives: JwtPermissionAlternative[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      sendError(res, 401, "Unauthorized");
      return;
    }
    if (req.userRole === "admin") {
      next();
      return;
    }
    const keys = req.permissionKeys;
    const ok = alternatives.some((a) => matchesJwtPermission(keys, a.module, a.action, a.scope));
    if (!ok) {
      sendError(res, 403, "Forbidden");
      return;
    }
    next();
  };
}
