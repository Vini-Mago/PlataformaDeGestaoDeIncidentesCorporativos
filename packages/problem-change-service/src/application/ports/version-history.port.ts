export interface EntityVersionRecord {
  id: string;
  versionNumber: number;
  changedById: string | null;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}

export interface IVersionHistoryRepository {
  listProblemVersions(problemId: string, limit: number): Promise<EntityVersionRecord[]>;
  listChangeVersions(changeId: string, limit: number): Promise<EntityVersionRecord[]>;
}
