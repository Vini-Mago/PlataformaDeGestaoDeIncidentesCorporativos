export interface BusinessCalendarConfig {
  workingDays: number[];
  workStartMinutes: number;
  workEndMinutes: number;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(dateKey(d));
}

function isBusinessMinute(d: Date, calendar: BusinessCalendarConfig, holidays: Set<string>): boolean {
  if (isHoliday(d, holidays)) return false;
  const day = d.getUTCDay();
  if (!calendar.workingDays.includes(day)) return false;
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return minutes >= calendar.workStartMinutes && minutes < calendar.workEndMinutes;
}

/** Adiciona minutos úteis a partir de `start` (UTC simplificado). */
export function addBusinessMinutes(
  start: Date,
  minutesToAdd: number,
  calendar: BusinessCalendarConfig,
  holidays: Set<string>
): Date {
  if (minutesToAdd <= 0) return new Date(start);
  let current = new Date(start);
  let added = 0;
  const safetyMax = minutesToAdd * 60 * 24;
  let guard = 0;
  while (added < minutesToAdd && guard < safetyMax) {
    guard++;
    if (isBusinessMinute(current, calendar, holidays)) {
      added++;
    }
    current = new Date(current.getTime() + 60_000);
  }
  return current;
}

/** Percentual do tempo útil consumido entre início e deadline (0–100+). */
export function percentBusinessTimeElapsed(
  startedAt: Date,
  deadline: Date,
  now: Date,
  calendar: BusinessCalendarConfig,
  holidays: Set<string>
): number {
  const total = businessMinutesBetween(startedAt, deadline, calendar, holidays);
  if (total <= 0) return now >= deadline ? 100 : 0;
  const elapsed = businessMinutesBetween(startedAt, now, calendar, holidays);
  return Math.round((elapsed / total) * 100);
}

function businessMinutesBetween(
  from: Date,
  to: Date,
  calendar: BusinessCalendarConfig,
  holidays: Set<string>
): number {
  if (to <= from) return 0;
  let current = new Date(from);
  let count = 0;
  const safetyMax = Math.ceil((to.getTime() - from.getTime()) / 60_000) * 2;
  let guard = 0;
  while (current < to && guard < safetyMax) {
    guard++;
    if (isBusinessMinute(current, calendar, holidays)) {
      count++;
    }
    current = new Date(current.getTime() + 60_000);
  }
  return count;
}
