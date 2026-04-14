import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import type { IUserRegistrationPersistence } from "../../../application/ports/user-registration-persistence.port";
import type { OutboxEvent } from "../../../application/ports/outbox-writer.port";
import { User } from "../../../domain/entities/user.entity";
import { UserAlreadyExistsError } from "../../../application/errors";

function isPrismaP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

type RegistrationTxLike = {
  userModel: { upsert: (args: unknown) => Promise<unknown> };
  authCredentialModel: { upsert: (args: unknown) => Promise<unknown> };
  outboxModel: { create: (args: unknown) => Promise<unknown> };
};

/**
 * Adapter: persiste usuário e credencial em uma única transação.
 * Optionally appends an outbox event in the same transaction (Outbox Pattern).
 */
export class PrismaUserRegistrationPersistence implements IUserRegistrationPersistence {
  constructor(private readonly prisma: PrismaClient) {}

  async saveUserAndCredential(
    user: User,
    passwordHash: string,
    outboxEvent?: OutboxEvent
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (txRaw: unknown) => {
        const tx = txRaw as unknown as RegistrationTxLike;
        await tx.userModel.upsert({
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
        await tx.authCredentialModel.upsert({
          where: { userId: user.id },
          create: { userId: user.id, passwordHash },
          update: { passwordHash },
        });
        if (outboxEvent) {
          await tx.outboxModel.create({
            data: {
              id: randomUUID(),
              eventName: outboxEvent.eventName,
              payload: outboxEvent.payload as object,
              createdAt: new Date(),
            },
          });
        }
      });
    } catch (err) {
      if (isPrismaP2002(err)) {
        throw new UserAlreadyExistsError("User with this email already exists");
      }
      throw err;
    }
  }
}
