import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Notification } from "../../../domain/entities/notification.entity";
import { VALID_NOTIFICATION_TYPES } from "../../../domain/entities/notification.entity";
import type {
  INotificationRepository,
  CreateNotificationInput,
  NotificationListFilters,
} from "../../../application/ports/notification-repository.port";

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const row = await this.prisma.notificationModel.create({
      data: {
        type: input.type,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body ?? null,
      },
    });
    return this.toNotification(row);
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notificationModel.findUnique({ where: { id } });
    return row ? this.toNotification(row) : null;
  }

  async list(filters: NotificationListFilters = {}): Promise<Notification[]> {
    const defaultLimit = 100;
    const maxLimit = 500;
    const limit = Math.min(
      filters.limit ?? defaultLimit,
      maxLimit
    );
    const offset = filters.offset ?? 0;
    const rows = await this.prisma.notificationModel.findMany({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.recipient && { recipient: filters.recipient }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.toNotification(r));
  }

  private parseType(value: string): Notification["type"] {
    if (VALID_NOTIFICATION_TYPES.includes(value as Notification["type"])) {
      return value as Notification["type"];
    }
    throw new Error(`Invalid notification type in database: "${value}"`);
  }

  private parseStatus(value: string): Notification["status"] {
    const valid: Notification["status"][] = ["pending", "sent", "delivered", "failed"];
    if (valid.includes(value as Notification["status"])) return value as Notification["status"];
    throw new Error(`Invalid notification status in database: "${value}"`);
  }

  private toNotification(row: {
    id: string;
    type: string;
    recipient: string;
    subject: string;
    body: string | null;
    status: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
  }): Notification {
    return {
      id: row.id,
      type: this.parseType(row.type),
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      status: this.parseStatus(row.status),
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      failedAt: row.failedAt,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
    };
  }
}
