export interface OutboxEvent {
  eventName: string;
  payload: object;
}
