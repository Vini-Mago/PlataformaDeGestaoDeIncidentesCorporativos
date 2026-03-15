export interface IEventPublisher {
  publish(eventName: string, payload: object): Promise<void>;
}
