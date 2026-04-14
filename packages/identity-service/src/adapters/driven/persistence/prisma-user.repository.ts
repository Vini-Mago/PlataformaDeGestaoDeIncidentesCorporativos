import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import { User } from "../../../domain/entities/user.entity";
import type { IUserRepository } from "../../../application/ports/user-repository.port";
import type { OutboxEvent } from "../../../application/ports/outbox-writer.port";
import { UserAlreadyExistsError } from "../../../application/errors";

type UserRow = {
  id: string;
  email: string;
  login: string;
  name: string;
  status: "active" | "inactive";
  phone: string | null;
  department: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
  preferredLanguage: string | null;
  timeZone: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaUserClientLike = {
  userModel: {
    upsert: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
  outboxModel: {
    create: (args: unknown) => Promise<unknown>;
  };
  $transaction: (queries: Promise<unknown>[]) => Promise<unknown[]>;
};

function isUserRow(value: unknown): value is UserRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.email === "string" &&
    typeof row.login === "string" &&
    typeof row.name === "string" &&
    typeof row.role === "string" &&
    row.createdAt instanceof Date &&
    row.updatedAt instanceof Date
  );
}

function isPrismaP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Adapter: implementação do repositório User com Prisma/PostgreSQL.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRowToUser(row: UserRow): User {
    return User.reconstitute(row.id, row.email, row.name, row.createdAt, row.role, row.updatedAt, row.status, {
      login: row.login,
      phone: row.phone,
      department: row.department,
      jobTitle: row.jobTitle,
      photoUrl: row.photoUrl,
      preferredLanguage: row.preferredLanguage,
      timeZone: row.timeZone,
    });
  }

  async save(user: User): Promise<void> {
    try {
      const prisma = this.prisma as unknown as PrismaUserClientLike;
      await prisma.userModel.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email.value,
          login: user.profile.login,
          name: user.name,
          status: user.status,
          phone: user.profile.phone,
          department: user.profile.department,
          jobTitle: user.profile.jobTitle,
          photoUrl: user.profile.photoUrl,
          preferredLanguage: user.profile.preferredLanguage,
          timeZone: user.profile.timeZone,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        update: {
          email: user.email.value,
          login: user.profile.login,
          name: user.name,
          status: user.status,
          phone: user.profile.phone,
          department: user.profile.department,
          jobTitle: user.profile.jobTitle,
          photoUrl: user.profile.photoUrl,
          preferredLanguage: user.profile.preferredLanguage,
          timeZone: user.profile.timeZone,
          role: user.role,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      if (isPrismaP2002(err)) {
        throw new UserAlreadyExistsError("User with this email already exists");
      }
      throw err;
    }
  }

  async saveUserAndOutbox(user: User, outboxEvent: OutboxEvent): Promise<void> {
    try {
      const prisma = this.prisma as unknown as PrismaUserClientLike;
      await prisma.$transaction([
        prisma.userModel.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email.value,
            login: user.profile.login,
            name: user.name,
            status: user.status,
            phone: user.profile.phone,
            department: user.profile.department,
            jobTitle: user.profile.jobTitle,
            photoUrl: user.profile.photoUrl,
            preferredLanguage: user.profile.preferredLanguage,
            timeZone: user.profile.timeZone,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          update: {
            email: user.email.value,
            login: user.profile.login,
            name: user.name,
            status: user.status,
            phone: user.profile.phone,
            department: user.profile.department,
            jobTitle: user.profile.jobTitle,
            photoUrl: user.profile.photoUrl,
            preferredLanguage: user.profile.preferredLanguage,
            timeZone: user.profile.timeZone,
            role: user.role,
            updatedAt: user.updatedAt,
          },
        }),
        prisma.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: outboxEvent.eventName,
            payload: outboxEvent.payload as object,
            createdAt: new Date(),
          },
        }),
      ]);
    } catch (err) {
      if (isPrismaP2002(err)) {
        throw new UserAlreadyExistsError("User with this email already exists");
      }
      throw err;
    }
  }

  async findById(id: string): Promise<User | null> {
    const prisma = this.prisma as unknown as PrismaUserClientLike;
    const row = await prisma.userModel.findUnique({
      where: { id },
    });
    if (!isUserRow(row)) return null;
    return this.mapRowToUser(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const prisma = this.prisma as unknown as PrismaUserClientLike;
    const row = await prisma.userModel.findUnique({
      where: { email },
    });
    if (!isUserRow(row)) return null;
    return this.mapRowToUser(row);
  }

  async findByLogin(login: string): Promise<User | null> {
    const prisma = this.prisma as unknown as PrismaUserClientLike;
    const row = await prisma.userModel.findUnique({
      where: { login: login.trim().toLowerCase() },
    });
    if (!isUserRow(row)) return null;
    return this.mapRowToUser(row);
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes("@")) {
      return this.findByEmail(normalized);
    }
    return this.findByLogin(normalized);
  }
}
