import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createAuditEntrySchema } from "./application/dtos/create-audit-entry.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
}).openapi("AuditEntry");

registry.registerPath({
  method: "post",
  path: "/api/audit-entries",
  summary: "Create audit entry",
  tags: ["Audit Entries"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createAuditEntrySchema.openapi("CreateAuditEntryBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: AuditEntrySchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/audit-entries",
  summary: "List audit entries",
  tags: ["Audit Entries"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of audit entries", content: { "application/json": { schema: z.array(AuditEntrySchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/audit-entries/{id}",
  summary: "Get audit entry by id",
  tags: ["Audit Entries"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Audit entry", content: { "application/json": { schema: AuditEntrySchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createAuditOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Audit Service API",
      version: "1.0.0",
      description: "RF-3.1/3.2: Audit trail (who, when, what) and history of changes.",
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
