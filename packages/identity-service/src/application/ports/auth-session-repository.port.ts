export interface AuthSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  ip: string | null;
  userAgent: string | null;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  createdAt: Date;
}

export interface CreateAuthSessionInput {
  userId: string;
  refreshTokenHash: string;
  ip?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}

export interface IAuthSessionRepository {
  create(input: CreateAuthSessionInput): Promise<AuthSession>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthSession | null>;
  touch(sessionId: string, at: Date): Promise<void>;
  revoke(sessionId: string, reason: string): Promise<void>;
  revokeAllExcept(userId: string, keepSessionId: string): Promise<void>;
  revokeAllByUserId(userId: string, reason: string): Promise<void>;
  listByUserId(userId: string): Promise<AuthSession[]>;
}
