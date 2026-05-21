import { logger } from "@pgic/shared";
import type { EvaluateSlaAssignmentsUseCase } from "../../../application/use-cases/evaluate-sla-assignments.use-case";

export class SlaEvaluationScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly evaluate: EvaluateSlaAssignmentsUseCase,
    private readonly intervalMs: number
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.evaluate.execute().catch((err) => {
        logger.error({ err }, "SLA evaluation job failed");
      });
    }, this.intervalMs);
    logger.info({ intervalMs: this.intervalMs }, "SLA evaluation scheduler started");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
