import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createIncidentSchema } from "./application/dtos/create-incident.dto";
import { changeIncidentStatusSchema } from "./application/dtos/change-incident-status.dto";
import { assignIncidentSchema } from "./application/dtos/assign-incident.dto";
import { addIncidentCommentSchema } from "./application/dtos/add-incident-comment.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const IncidentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  criticality: z.string(),
  serviceAffected: z.string().nullable(),
  requesterId: z.string(),
  assignedTeamId: z.string().nullable(),
  assignedToId: z.string().nullable(),
  problemId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
}).openapi("Incident");

const CommentSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
}).openapi("IncidentComment");

const IncidentWithCommentsSchema = IncidentSchema.extend({
  comments: z.array(CommentSchema),
}).openapi("IncidentWithComments");

registry.registerPath({
  method: "post",
  path: "/api/incidents",
  summary: "Create incident",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createIncidentSchema.openapi("CreateIncidentBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: IncidentSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/incidents",
  summary: "List incidents",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of incidents", content: { "application/json": { schema: z.array(IncidentSchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/incidents/{id}",
  summary: "Get incident by id (with comments)",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Incident with comments", content: { "application/json": { schema: IncidentWithCommentsSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/incidents/{id}/status",
  summary: "Change incident status",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: changeIncidentStatusSchema.openapi("ChangeStatusBody") } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: IncidentSchema } } },
    400: { description: "Invalid transition", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/incidents/{id}/assign",
  summary: "Assign incident to team/user",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: assignIncidentSchema.openapi("AssignBody") } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: IncidentSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/incidents/{id}/comments",
  summary: "Add comment to incident",
  tags: ["Incidents"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: addIncidentCommentSchema.openapi("AddCommentBody") } } },
  },
  responses: {
    201: { description: "Comment added", content: { "application/json": { schema: CommentSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createIncidentOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Incident Service API",
      version: "1.0.0",
      description: "Incident lifecycle (RF-5.x): CRUD, workflow states, assignment, comments.",
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
