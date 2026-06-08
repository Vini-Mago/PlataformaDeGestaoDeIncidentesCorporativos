import type { Request, Response, NextFunction } from "express";
import { monitoringWebhookBodySchema } from "../../../application/dtos/monitoring-webhook.dto";
import { createOutboundDeliveryBodySchema } from "../../../application/dtos/create-outbound-delivery.dto";
import type { ProcessMonitoringWebhookUseCase } from "../../../application/use-cases/process-monitoring-webhook.use-case";
import type { ListIntegrationLogsUseCase } from "../../../application/use-cases/list-integration-logs.use-case";
import type { CreateOutboundDeliveryUseCase } from "../../../application/use-cases/create-outbound-delivery.use-case";
import {
  parseIntegrationDlqStatus,
  type ListIntegrationDlqUseCase,
} from "../../../application/use-cases/list-integration-dlq.use-case";
import type { ReprocessIntegrationDlqUseCase } from "../../../application/use-cases/reprocess-integration-dlq.use-case";
import type { GetIntegrationIncidentUseCase } from "../../../application/use-cases/get-integration-incident.use-case";
import type { UpdateIntegrationIncidentUseCase } from "../../../application/use-cases/update-integration-incident.use-case";

export class IntegrationController {
  constructor(
    private readonly processMonitoringWebhook: ProcessMonitoringWebhookUseCase,
    private readonly createOutboundDelivery: CreateOutboundDeliveryUseCase,
    private readonly listIntegrationLogs: ListIntegrationLogsUseCase,
    private readonly listIntegrationDlq: ListIntegrationDlqUseCase,
    private readonly reprocessIntegrationDlq: ReprocessIntegrationDlqUseCase,
    private readonly getIntegrationIncident: GetIntegrationIncidentUseCase,
    private readonly updateIntegrationIncident: UpdateIntegrationIncidentUseCase,
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

  createOutbound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createOutboundDeliveryBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
        return;
      }
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.createOutboundDelivery.execute({
        body: parsed.data,
        correlationId,
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

  listDlq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const status = parseIntegrationDlqStatus(req.query.status);
      const items = await this.listIntegrationDlq.execute({
        status,
        limit: Number.isFinite(limit) ? limit : 50,
      });
      res.json({ items });
    } catch (err) {
      next(err);
    }
  };

  reprocessDlq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.reprocessIntegrationDlq.execute(req.params.id);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  };

  getIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.getIntegrationIncident.execute({ id, correlationId });
      res.json(result);
    } catch (err: any) {
      if (err.message && err.message.includes("status 404")) {
        res.status(404).json({ error: `Incident not found with ID: ${req.params.id}` });
        return;
      }
      next(err);
    }
  };

  getIncidentByExternalId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { externalId } = req.params;
      const source = (req.query.source as string) ?? "monitoring";
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.getIntegrationIncident.execute({ externalId, source, correlationId });
      res.json(result);
    } catch (err: any) {
      if (err.message && err.message.includes("not found")) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  };

  updateIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      if (!status) {
        res.status(400).json({ error: "Missing required field: status" });
        return;
      }
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.updateIntegrationIncident.execute({
        id,
        status,
        comment,
        correlationId,
      });
      res.json(result);
    } catch (err: any) {
      if (err.message && err.message.includes("status 404")) {
        res.status(404).json({ error: `Incident not found with ID: ${req.params.id}` });
        return;
      }
      next(err);
    }
  };

  updateIncidentByExternalId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { externalId } = req.params;
      const { status, comment } = req.body;
      const source = (req.query.source as string) ?? "monitoring";
      if (!status) {
        res.status(400).json({ error: "Missing required field: status" });
        return;
      }
      const correlationId = req.header("x-correlation-id") ?? req.header("X-Correlation-Id") ?? undefined;
      const result = await this.updateIntegrationIncident.execute({
        externalId,
        source,
        status,
        comment,
        correlationId,
      });
      res.json(result);
    } catch (err: any) {
      if (err.message && err.message.includes("not found")) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  };
}
