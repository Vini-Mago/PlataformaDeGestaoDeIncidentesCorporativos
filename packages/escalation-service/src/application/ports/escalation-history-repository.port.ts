export interface CreateEscalationHistoryInput {
  ruleId: string | null;
  ticketId: string;
  ticketType: string;
  actionExecuted: string;
  payload?: object | null;
}

export interface EscalationHistoryRecord {
  id: string;
  ruleId: string | null;
  ticketId: string;
  ticketType: string;
  actionExecuted: string;
  payload: object | null;
  triggeredAt: Date;
}

export interface IEscalationHistoryRepository {
  create(input: CreateEscalationHistoryInput): Promise<void>;
  existsRecent(ruleId: string, ticketId: string, ticketType: string, withinMinutes: number): Promise<boolean>;
  findByTicket(ticketId: string, ticketType: string): Promise<EscalationHistoryRecord[]>;
}
