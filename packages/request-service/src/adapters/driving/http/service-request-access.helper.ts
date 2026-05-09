import type { Request } from "express";
import { matchesJwtPermission } from "@pgic/shared";
import type { ServiceRequest } from "../../../domain/entities/service-request.entity";

export function canReadAllServiceRequests(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "requests", "read", "all");
}

export function canUpdateAllServiceRequests(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "requests", "update", "all");
}

export function isServiceRequestParticipant(
  sr: Pick<ServiceRequest, "requesterId" | "assignedToId">,
  userId: string
): boolean {
  return sr.requesterId === userId || sr.assignedToId === userId;
}
