import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import type {
  IPasswordResetTokenRepository,
  PasswordResetTokenRecord,
} from "../../../application/ports/password-reset-token-repository.port";

type PasswordResetTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  requesterIp: string | null;
  createdAt: Date;
};

type PrismaPasswordResetClientLike = {
  passwordResetTokenModel: {
    create: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
};

function mapRecord(row: PasswordResetTokenRow): PasswordResetTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    requesterIp: row.requesterIp,
    createdAt: row.createdAt,
  };
}

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requesterIp?: string | null;
  }): Promise<PasswordResetTokenRecord> {
    const prisma = this.prisma as unknown as PrismaPasswordResetClientLike;
    const row = await prisma.passwordResetTokenModel.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        requesterIp: input.requesterIp ?? null,
        createdAt: new Date(),
      },
    });
    return mapRecord(row as PasswordResetTokenRow);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const prisma = this.prisma as unknown as PrismaPasswordResetClientLike;
    const row = await prisma.passwordResetTokenModel.findUnique({
      where: { tokenHash },
    });
    return row ? mapRecord(row as PasswordResetTokenRow) : null;
  }

  async markUsed(id: string): Promise<void> {
    const prisma = this.prisma as unknown as PrismaPasswordResetClientLike;
    await prisma.passwordResetTokenModel.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
