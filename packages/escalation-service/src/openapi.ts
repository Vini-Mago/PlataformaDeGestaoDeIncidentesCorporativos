import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createEscalationRuleSchema } from "./application/dtos/create-escalation-rule.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const EscalationRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  ticketType: z.enum(["incident", "request"]),
  conditionType: z.string(),
  conditionValue: z.string(),
  actions: z.array(z.string()),
  priority: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("EscalationRule");

registry.registerPath({
  method: "post",
  path: "/api/escalation-rules",
  summary: "Create escalation rule",
  tags: ["Escalation Rules"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createEscalationRuleSchema.openapi("CreateEscalationRuleBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: EscalationRuleSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const EscalationRulesQuerySchema = z.object({
  ticketType: z.enum(["incident", "request"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
}).openapi("EscalationRulesQuery");

registry.registerPath({
  method: "get",
  path: "/api/escalation-rules",
  summary: "List escalation rules",
  tags: ["Escalation Rules"],
  security: [{ bearerAuth: [] }],
  request: { query: EscalationRulesQuerySchema },
  responses: {
    200: { description: "List of escalation rules", content: { "application/json": { schema: z.array(EscalationRuleSchema) } } },
    400: { description: "Invalid filter", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/escalation-rules/{id}",
  summary: "Get escalation rule by id",
  tags: ["Escalation Rules"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Escalation rule", content: { "application/json": { schema: EscalationRuleSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createEscalationOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Escalation Service API",
      version: "1.0.0",
      description: "RF-8.3: Escalation rules (conditions and actions) and orchestration of escalations.",
    },
    servers: [{ url: serverUrl }],
  });
  const docObj = doc as { components?: { securitySchemes?: object } };
  if (!docObj.components) docObj.components = {};
  docObj.components.securitySchemes = {
    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  };
  return docObj;
}
