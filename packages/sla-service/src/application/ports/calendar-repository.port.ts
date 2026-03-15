import type { Calendar } from "../../domain/entities/calendar.entity";

export interface CreateCalendarInput {
  name: string;
  timezone?: string;
  workingDays: number[];
  workStartMinutes: number;
  workEndMinutes: number;
}

export interface ICalendarRepository {
  create(input: CreateCalendarInput): Promise<Calendar>;
  findById(id: string): Promise<Calendar | null>;
  list(): Promise<Calendar[]>;
}
