import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createProblemSchema } from "./application/dtos/create-problem.dto";
import { updateProblemSchema } from "./application/dtos/update-problem.dto";
import { createChangeSchema } from "./application/dtos/create-change.dto";
import { updateChangeSchema } from "./application/dtos/update-change.dto";
import { linkProblemToChangeSchema } from "./application/dtos/link-problem-to-change.dto";

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

const ProblemDetailSchema = ProblemSchema.extend({
  linkedIncidentIds: z.array(z.string().uuid()),
}).openapi("ProblemDetail");

const LinkIncidentBodySchema = z.object({ incidentId: z.string().uuid() }).openapi("LinkIncidentBody");

const IncidentProblemLinkRowSchema = z
  .object({
    incidentId: z.string().uuid(),
    problemId: z.string().uuid(),
    problemTitle: z.string(),
  })
  .openapi("IncidentProblemLink");

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

const ChangeDetailSchema = ChangeSchema.extend({
  linkedIncidentIds: z.array(z.string().uuid()),
  linkedProblemIds: z.array(z.string().uuid()),
}).openapi("ChangeDetail");

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
  path: "/api/problems/linked-for-incidents",
  summary: "List problem links for given incident ids (RF-7.1)",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: { query: z.object({ incidentIds: z.string() }) },
  responses: {
    200: {
      description: "Link rows",
      content: { "application/json": { schema: z.array(IncidentProblemLinkRowSchema) } },
    },
    400: { description: "Bad query", content: { "application/json": { schema: ErrorSchema } } },
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
    200: { description: "Problem", content: { "application/json": { schema: ProblemDetailSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/problems/{id}",
  summary: "Update problem (RF-7.2: causa raiz, plano de ação, estado)",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateProblemSchema.openapi("UpdateProblemBody") } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: ProblemDetailSchema } } },
    400: { description: "Validation or invalid transition", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/problems/{id}/incidents",
  summary: "Link incident (logical id from incident-service)",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: LinkIncidentBodySchema } } },
  },
  responses: {
    204: { description: "Linked" },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Problem not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/problems/{id}/incidents/{incidentId}",
  summary: "Unlink incident",
  tags: ["Problems"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid(), incidentId: z.string().uuid() }) },
  responses: {
    204: { description: "Unlinked (idempotent)" },
    400: { description: "Invalid UUID", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Problem not found", content: { "application/json": { schema: ErrorSchema } } },
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
  method: "post",
  path: "/api/changes/{id}/incidents",
  summary: "Link incident motivador (RF-7.3)",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: LinkIncidentBodySchema } } },
  },
  responses: {
    204: { description: "Linked" },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Change not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/changes/{id}/incidents/{incidentId}",
  summary: "Unlink incident",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid(), incidentId: z.string().uuid() }) },
  responses: {
    204: { description: "Unlinked (idempotent)" },
    400: { description: "Invalid UUID", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Change not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/changes/{id}/problems",
  summary: "Link problem motivador (RF-7.3)",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: linkProblemToChangeSchema.openapi("LinkProblemBodyForm") } } },
  },
  responses: {
    204: { description: "Linked" },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Change or problem not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/changes/{id}/problems/{problemId}",
  summary: "Unlink problem",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid(), problemId: z.string().uuid() }) },
  responses: {
    204: { description: "Unlinked (idempotent)" },
    400: { description: "Invalid UUID", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Change not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/changes/{id}",
  summary: "Update change — workflow RF-7.3 (estado, janela, rollback, CAB High)",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateChangeSchema.openapi("UpdateChangeBody") } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: ChangeDetailSchema } } },
    400: { description: "Validation / transição / janela", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/changes/{id}",
  summary: "Get change by id (com vínculos)",
  tags: ["Changes"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Change", content: { "application/json": { schema: ChangeDetailSchema } } },
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
