import { PrismaClient } from "../../../../generated/prisma-client/index";
import type {
  CreateEscalationHistoryInput,
  IEscalationHistoryRepository,
} from "../../../application/ports/escalation-history-repository.port";

export class PrismaEscalationHistoryRepository implements IEscalationHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateEscalationHistoryInput): Promise<void> {
    await this.prisma.escalationHistoryModel.create({
      data: {
        ruleId: input.ruleId,
        ticketId: input.ticketId,
        ticketType: input.ticketType,
        triggeredAt: new Date(),
        actionExecuted: input.actionExecuted,
        payload: (input.payload ?? undefined) as object | undefined,
      },
    });
  }

  async existsRecent(
    ruleId: string,
    ticketId: string,
    ticketType: string,
    withinMinutes: number
  ): Promise<boolean> {
    const since = new Date(Date.now() - withinMinutes * 60_000);
    const count = await this.prisma.escalationHistoryModel.count({
      where: {
        ruleId,
        ticketId,
        ticketType,
        triggeredAt: { gte: since },
      },
    });
    return count > 0;
  }
}
