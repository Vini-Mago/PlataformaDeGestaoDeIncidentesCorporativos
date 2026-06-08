import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { monitoringWebhookBodySchema } from "./application/dtos/monitoring-webhook.dto";
import { createOutboundDeliveryBodySchema } from "./application/dtos/create-outbound-delivery.dto";

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

const OutboundDeliveryAcceptedSchema = z
  .object({
    accepted: z.literal(true),
    deliveryId: z.string().uuid(),
    endpoint: z.string().url(),
    eventName: z.literal("integration.outbound_dispatch"),
  })
  .openapi("OutboundDeliveryAccepted");

registry.registerPath({
  method: "post",
  path: "/api/outbound/v1/deliver",
  summary: "Queue outbound integration call for async delivery (timeout/retry/DLQ)",
  tags: ["Outbound Integrations"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createOutboundDeliveryBodySchema.openapi("CreateOutboundDeliveryBody"),
        },
      },
    },
  },
  responses: {
    202: {
      description: "Accepted for async processing",
      content: { "application/json": { schema: OutboundDeliveryAcceptedSchema } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    422: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const IntegrationLogSchema = z
  .object({
    id: z.string().uuid(),
    direction: z.string(),
    endpoint: z.string(),
    httpStatus: z.number().nullable(),
    correlationId: z.string().nullable(),
    externalId: z.string().nullable(),
    payloadSummary: z.record(z.unknown()).nullable(),
    errorMessage: z.string().nullable(),
    durationMs: z.number().nullable(),
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

const IntegrationDlqSchema = z
  .object({
    id: z.string().uuid(),
    eventName: z.string(),
    payload: z.record(z.unknown()),
    errorMessage: z.string(),
    reprocessedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("IntegrationDlqItem");

const IntegrationDlqReprocessSchema = z
  .object({
    id: z.string().uuid(),
    eventName: z.string(),
    reprocessedAt: z.string().datetime(),
  })
  .openapi("IntegrationDlqReprocessAccepted");

registry.registerPath({
  method: "get",
  path: "/api/integration-dlq",
  summary: "List integration DLQ items",
  tags: ["Integration DLQ"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      status: z.enum(["pending", "reprocessed", "all"]).optional(),
      limit: z.coerce.number().int().positive().max(200).optional(),
    }),
  },
  responses: {
    200: {
      description: "DLQ items",
      content: {
        "application/json": {
          schema: z.object({ items: z.array(IntegrationDlqSchema) }),
        },
      },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/integration-dlq/{id}/reprocess",
  summary: "Re-enqueue a DLQ item into the integration outbox",
  tags: ["Integration DLQ"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    202: {
      description: "Reprocess accepted",
      content: { "application/json": { schema: IntegrationDlqReprocessSchema } },
    },
    404: { description: "DLQ item not found", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "DLQ item already reprocessed", content: { "application/json": { schema: ErrorSchema } } },
  },
});
const IncidentResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  criticality: z.string(),
  serviceAffected: z.string().nullable(),
  requesterId: z.string(),
  assignedTeamId: z.string().nullable(),
  assignedToId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi("IncidentResponse");

const UpdateIncidentStatusBodySchema = z.object({
  status: z.enum(["Open", "InAnalysis", "InProgress", "PendingCustomer", "Resolved", "Closed"]),
  comment: z.string().optional(),
}).openapi("UpdateIncidentStatusBody");

registry.registerPath({
  method: "get",
  path: "/api/webhooks/v1/incidents/{id}",
  summary: "Get incident by internal UUID (external systems)",
  tags: ["External Systems Incidents"],
  security: [{ apiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Incident details",
      content: { "application/json": { schema: IncidentResponseSchema } },
    },
    401: { description: "Invalid API key", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Incident not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/webhooks/v1/incidents/external/{externalId}",
  summary: "Get incident by external ID (external systems)",
  tags: ["External Systems Incidents"],
  security: [{ apiKeyAuth: [] }],
  request: {
    params: z.object({ externalId: z.string() }),
    query: z.object({ source: z.string().optional() }),
  },
  responses: {
    200: {
      description: "Incident details",
      content: { "application/json": { schema: IncidentResponseSchema } },
    },
    401: { description: "Invalid API key", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Incident not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/webhooks/v1/incidents/{id}",
  summary: "Update incident status by internal UUID (external systems)",
  tags: ["External Systems Incidents"],
  security: [{ apiKeyAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: UpdateIncidentStatusBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated incident details",
      content: { "application/json": { schema: IncidentResponseSchema } },
    },
    400: { description: "Invalid input or transition", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Invalid API key", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Incident not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/webhooks/v1/incidents/external/{externalId}",
  summary: "Update incident status by external ID (external systems)",
  tags: ["External Systems Incidents"],
  security: [{ apiKeyAuth: [] }],
  request: {
    params: z.object({ externalId: z.string() }),
    query: z.object({ source: z.string().optional() }),
    body: {
      content: {
        "application/json": {
          schema: UpdateIncidentStatusBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated incident details",
      content: { "application/json": { schema: IncidentResponseSchema } },
    },
    400: { description: "Invalid input or transition", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Invalid API key", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Incident not found", content: { "application/json": { schema: ErrorSchema } } },
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
