export interface SlaAssignmentRecord {
  id: string;
  ticketId: string;
  ticketType: string;
  policyId: string;
  responseDeadline: Date;
  resolutionDeadline: Date;
  clockStartedAt: Date;
  status: "active" | "paused" | "completed";
  riskEmitted: boolean;
  responseBreachEmitted: boolean;
  resolutionBreachEmitted: boolean;
}

export interface CreateSlaAssignmentInput {
  ticketId: string;
  ticketType: "incident" | "request";
  policyId: string;
  responseDeadline: Date;
  resolutionDeadline: Date;
  clockStartedAt: Date;
}

export interface ISlaAssignmentRepository {
  create(input: CreateSlaAssignmentInput): Promise<SlaAssignmentRecord>;
  findByTicket(ticketId: string, ticketType: string): Promise<SlaAssignmentRecord | null>;
  listActive(): Promise<SlaAssignmentRecord[]>;
  setStatus(ticketId: string, ticketType: string, status: SlaAssignmentRecord["status"]): Promise<void>;
  markRiskEmitted(id: string): Promise<void>;
  markResponseBreachEmitted(id: string): Promise<void>;
  markResolutionBreachEmitted(id: string): Promise<void>;
}

export interface IOutboxWriter {
  enqueue(eventName: string, payload: object): Promise<void>;
}
