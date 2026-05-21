export interface IOutboxWriter {
  enqueue(eventName: string, payload: object): Promise<void>;
}
