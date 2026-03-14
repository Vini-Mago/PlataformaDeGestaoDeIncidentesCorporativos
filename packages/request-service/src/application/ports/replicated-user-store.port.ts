/**
 * Port for storing replicated user data (from identity-service user.created events).
 * Implemented by a Prisma adapter; allows idempotent upsert by userId.
 */
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
