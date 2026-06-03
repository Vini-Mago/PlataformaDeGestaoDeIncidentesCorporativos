import { bffFetchJson } from "./http";

export type EscalationHistoryRecord = {
  id: string;
  ruleId: string | null;
  ticketId: string;
  ticketType: string;
  actionExecuted: string;
  payload: object | null;
  triggeredAt: string;
};

export async function fetchEscalationHistory(ticketId: string, ticketType: string = "incident"): Promise<EscalationHistoryRecord[]> {
  return bffFetchJson<EscalationHistoryRecord[]>(`/escalation/history/ticket/${ticketType}/${ticketId}`);
}
