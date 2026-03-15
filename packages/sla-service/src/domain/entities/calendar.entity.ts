/**
 * Calendar entity — working days, business hours, timezone (RF-8.2).
 * Domain-only; no framework imports.
 */
export interface Calendar {
  id: string;
  name: string;
  timezone: string;
  workingDays: number[];
  workStartMinutes: number;
  workEndMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}
