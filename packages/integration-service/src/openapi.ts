import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { monitoringWebhookBodySchema } from "./application/dtos/monitoring-webhook.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string() }).openapi("IntegrationError");

const WebhookAcceptedSchema = z
  .object({
    accepted: z.literal(true),
    externalId: z.string(),
    logId: z.string().uuid(),
  })
  .openapi("WebhookAccepted");

registry.registerPath({
  method: "post",
  path: "/api/webhooks/v1/monitoring",
  summary: "Ingest monitoring alert (creates incident via async pipeline)",
  tags: ["Webhooks"],
  security: [{ apiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: monitoringWebhookBodySchema.openapi("MonitoringWebhookBody"),
        },
      },
    },
  },
  responses: {
    202: {
      description: "Accepted for processing",
      content: { "application/json": { schema: WebhookAcceptedSchema } },
    },
    401: {
      description: "Invalid API key or signature",
      content: { "application/json": { schema: ErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const IntegrationLogSchema = z
  .object({
    id: z.string().uuid(),
    direction: z.string(),
    endpoint: z.string(),
    httpStatus: z.number().nullable(),
    externalId: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("IntegrationLog");

registry.registerPath({
  method: "get",
  path: "/api/integration-logs",
  summary: "List integration logs (admin)",
  tags: ["Integration Logs"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Recent logs",
      content: {
        "application/json": {
          schema: z.object({ items: z.array(IntegrationLogSchema) }),
        },
      },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createIntegrationOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Integration Service API",
      version: "1.0.0",
      description:
        "RF-9.x: Webhooks de monitoramento, logs de integração e ingestão assíncrona de incidentes.",
    },
    servers: [{ url: serverUrl }],
  });
  const docObj = doc as { components?: { securitySchemes?: Record<string, unknown> } };
  if (!docObj.components) docObj.components = {};
  docObj.components.securitySchemes = {
    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
  };
  return docObj;
}
