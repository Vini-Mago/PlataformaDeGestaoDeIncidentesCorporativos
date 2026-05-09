/** RF-7.3: execução só dentro da janela aprovada (instantes em UTC). */
export function isWithinExecutionWindow(
  windowStart: Date | null,
  windowEnd: Date | null,
  at: Date
): boolean {
  if (!windowStart || !windowEnd) {
    return false;
  }
  return at >= windowStart && at <= windowEnd;
}
