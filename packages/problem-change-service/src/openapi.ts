import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createProblemSchema } from "./application/dtos/create-problem.dto";
import { createChangeSchema } from "./application/dtos/create-change.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const ProblemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  rootCause: z.string().nullable(),
  actionPlan: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
}).openapi("Problem");

const ChangeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  justification: z.string(),
  changeType: z.string(),
  risk: z.string(),
  status: z.string(),
  windowStart: z.string().datetime().nullable(),
  windowEnd: z.string().datetime().nullable(),
  rollbackPlan: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
}).openapi("Change");

registry.registerPath({
  method: "post",
  path: "/api/problems",
  summary: "Create problem",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createProblemSchema.openapi("CreateProblemBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: ProblemSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/problems",
  summary: "List problems",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of problems", content: { "application/json": { schema: z.array(ProblemSchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/problems/{id}",
  summary: "Get problem by id",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Problem", content: { "application/json": { schema: ProblemSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/changes",
  summary: "Create change",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createChangeSchema.openapi("CreateChangeBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: ChangeSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/changes",
  summary: "List changes",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of changes", content: { "application/json": { schema: z.array(ChangeSchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/changes/{id}",
  summary: "Get change by id",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Change", content: { "application/json": { schema: ChangeSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createProblemChangeOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Problem-change Service API",
      version: "1.0.0",
      description: "RF-7.x: Problems (root cause, action plan) and Changes (Change Management: window, risk, rollback).",
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
