import type { SlaPolicy } from "../../domain/entities/sla-policy.entity";

export interface CreateSlaPolicyInput {
  name: string;
  ticketType: "incident" | "request";
  criticality?: string | null;
  serviceId?: string | null;
  clientId?: string | null;
  responseMinutes: number;
  resolutionMinutes: number;
  calendarId: string;
  priority?: number;
  isActive?: boolean;
}

export interface SlaPolicyListFilters {
  ticketType?: "incident" | "request";
  isActive?: boolean;
}

export interface ISlaPolicyRepository {
  create(input: CreateSlaPolicyInput): Promise<SlaPolicy>;
  findById(id: string): Promise<SlaPolicy | null>;
  list(filters?: SlaPolicyListFilters): Promise<SlaPolicy[]>;
}
