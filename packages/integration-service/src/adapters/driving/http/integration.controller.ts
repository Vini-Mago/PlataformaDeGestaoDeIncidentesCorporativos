import type { Request, Response, NextFunction } from "express";
import { monitoringWebhookBodySchema } from "../../../application/dtos/monitoring-webhook.dto";
import type { ProcessMonitoringWebhookUseCase } from "../../../application/use-cases/process-monitoring-webhook.use-case";
import type { ListIntegrationLogsUseCase } from "../../../application/use-cases/list-integration-logs.use-case";

export class IntegrationController {
  constructor(
    private readonly processMonitoringWebhook: ProcessMonitoringWebhookUseCase,
    private readonly listIntegrationLogs: ListIntegrationLogsUseCase,
    private readonly systemUserId: string
  ) {}

  monitoringWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monitoringWebhookBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
        return;
      }
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.processMonitoringWebhook.execute({
        body: parsed.data,
        correlationId,
        systemUserId: this.systemUserId,
      });
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  };

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const logs = await this.listIntegrationLogs.execute(Number.isFinite(limit) ? limit : 50);
      res.json({ items: logs });
    } catch (err) {
      next(err);
    }
  };
}
