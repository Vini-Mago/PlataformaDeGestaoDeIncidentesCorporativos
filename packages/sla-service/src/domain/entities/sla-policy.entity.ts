/**
 * SLA policy entity — conditions and response/resolution times (RF-8.1).
 * Domain-only; no framework imports.
 */
export interface SlaPolicy {
  id: string;
  name: string;
  ticketType: "incident" | "request";
  criticality: string | null;
  serviceId: string | null;
  clientId: string | null;
  responseMinutes: number;
  resolutionMinutes: number;
  calendarId: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const VALID_TICKET_TYPES = ["incident", "request"] as const;
export const VALID_CRITICALITIES = ["Low", "Medium", "High", "Critical"] as const;
