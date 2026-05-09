import type { Request } from "express";
import { matchesJwtPermission } from "@pgic/shared";
import type { Incident } from "../../../domain/entities/incident.entity";

export function canReadAllIncidents(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "incidents", "read", "all");
}

export function canUpdateAllIncidents(req: Request): boolean {
  if (req.userRole === "admin") return true;
  return matchesJwtPermission(req.permissionKeys, "incidents", "update", "all");
}

export function isIncidentParticipant(
  incident: Pick<Incident, "requesterId" | "assignedToId">,
  userId: string
): boolean {
  return incident.requesterId === userId || incident.assignedToId === userId;
}
