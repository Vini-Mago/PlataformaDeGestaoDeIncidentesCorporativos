import type { Request } from "express";
import {
  matchesJwtPermission,
  requireAnyJwtPermission,
  type JwtPermissionAlternative,
} from "@pgic/shared";

export const REPORT_EXPORT_JOB_PERMISSION_ALTERNATIVES: JwtPermissionAlternative[] = [
  { module: "reporting", action: "export", scope: "all" },
  { module: "reporting", action: "export", scope: "own" },
];

export function canAccessAllReportExports(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "reporting", "export", "all");
}

export function requireReportExportJobAccess() {
  return requireAnyJwtPermission(REPORT_EXPORT_JOB_PERMISSION_ALTERNATIVES);
}
