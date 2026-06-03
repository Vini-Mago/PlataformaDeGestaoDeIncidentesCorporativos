import type { Request } from "express";
import { matchesJwtPermission } from "@pgic/shared";
import type { Problem } from "../../../domain/entities/problem.entity";
import type { Change } from "../../../domain/entities/change.entity";

export function canReadAllProblems(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "problems", "read", "all");
}

export function canReadAllChanges(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "changes", "read", "all");
}

export function canUpdateAllProblems(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "problems", "update", "all");
}

export function canUpdateAllChanges(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "changes", "update", "all");
}

export function isProblemOwner(problem: Pick<Problem, "createdById">, userId: string): boolean {
  return problem.createdById === userId;
}

export function isChangeOwner(change: Pick<Change, "createdById">, userId: string): boolean {
  return change.createdById === userId;
}
