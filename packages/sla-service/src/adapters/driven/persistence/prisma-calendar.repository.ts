import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Calendar } from "../../../domain/entities/calendar.entity";
import type {
  ICalendarRepository,
  CreateCalendarInput,
} from "../../../application/ports/calendar-repository.port";

export class PrismaCalendarRepository implements ICalendarRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCalendarInput): Promise<Calendar> {
    const row = await this.prisma.calendarModel.create({
      data: {
        name: input.name,
        timezone: input.timezone ?? "UTC",
        workingDays: input.workingDays,
        workStartMinutes: input.workStartMinutes,
        workEndMinutes: input.workEndMinutes,
      },
    });
    return this.toCalendar(row);
  }

  async findById(id: string): Promise<Calendar | null> {
    const row = await this.prisma.calendarModel.findUnique({ where: { id } });
    return row ? this.toCalendar(row) : null;
  }

  async listHolidayDates(calendarId: string): Promise<Set<string>> {
    const rows = await this.prisma.holidayModel.findMany({
      where: { calendarId },
      select: { date: true },
    });
    return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
  }

  async list(): Promise<Calendar[]> {
    const rows = await this.prisma.calendarModel.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map((r) => this.toCalendar(r));
  }

  private toCalendar(row: {
    id: string;
    name: string;
    timezone: string;
    workingDays: number[];
    workStartMinutes: number;
    workEndMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  }): Calendar {
    return {
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      workingDays: row.workingDays,
      workStartMinutes: row.workStartMinutes,
      workEndMinutes: row.workEndMinutes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
