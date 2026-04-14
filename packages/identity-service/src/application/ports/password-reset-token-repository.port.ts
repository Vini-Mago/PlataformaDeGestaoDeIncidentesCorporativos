export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  requesterIp: string | null;
  createdAt: Date;
}

export interface IPasswordResetTokenRepository {
  create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requesterIp?: string | null;
  }): Promise<PasswordResetTokenRecord>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(id: string): Promise<void>;
}
