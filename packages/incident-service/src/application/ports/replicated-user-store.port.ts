export interface ReplicatedUserData {
  id: string;
  email: string;
  name: string;
  lastEventOccurredAt: Date;
}

export interface IReplicatedUserStore {
  upsert(data: ReplicatedUserData): Promise<void>;
  findById(id: string): Promise<ReplicatedUserData | null>;
}
