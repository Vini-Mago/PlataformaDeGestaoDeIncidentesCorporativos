import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import type {
  AuthSession,
  CreateAuthSessionInput,
  IAuthSessionRepository,
} from "../../../application/ports/auth-session-repository.port";

type AuthSessionRow = {
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
};

type PrismaAuthSessionClientLike = {
  authSessionModel: {
    create: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

function mapSession(row: AuthSessionRow): AuthSession {
  return {
    id: row.id,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    ip: row.ip,
    userAgent: row.userAgent,
    lastActivityAt: row.lastActivityAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    revokeReason: row.revokeReason,
    createdAt: row.createdAt,
  };
}

export class PrismaAuthSessionRepository implements IAuthSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    const row = await prisma.authSessionModel.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        lastActivityAt: new Date(),
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      },
    });
    return mapSession(row as AuthSessionRow);
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthSession | null> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    const row = await prisma.authSessionModel.findUnique({
      where: { refreshTokenHash },
    });
    return row ? mapSession(row as AuthSessionRow) : null;
  }

  async touch(sessionId: string, at: Date): Promise<void> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    await prisma.authSessionModel.update({
      where: { id: sessionId },
      data: { lastActivityAt: at },
    });
  }

  async revoke(sessionId: string, reason: string): Promise<void> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    await prisma.authSessionModel.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllExcept(userId: string, keepSessionId: string): Promise<void> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    await prisma.authSessionModel.updateMany({
      where: { userId, id: { not: keepSessionId }, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "logout_others" },
    });
  }

  async revokeAllByUserId(userId: string, reason: string): Promise<void> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    await prisma.authSessionModel.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async listByUserId(userId: string): Promise<AuthSession[]> {
    const prisma = this.prisma as unknown as PrismaAuthSessionClientLike;
    const rows = await prisma.authSessionModel.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return (rows as AuthSessionRow[]).map(mapSession);
  }
}
