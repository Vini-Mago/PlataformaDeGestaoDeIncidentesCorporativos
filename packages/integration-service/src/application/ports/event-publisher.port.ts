export interface IEventPublisher {
  connect(): Promise<void>;
  publish(eventName: string, payload: object): Promise<void>;
  disconnect(): Promise<void>;
}
