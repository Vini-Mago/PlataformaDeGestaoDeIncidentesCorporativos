import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createCatalogItemSchema } from "./application/dtos/create-catalog-item.dto";
import { createServiceRequestSchema } from "./application/dtos/create-service-request.dto";
import { addRequestCommentSchema } from "./application/dtos/add-request-comment.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const CatalogItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  responsibleTeamId: z.string().uuid().nullable(),
  defaultSlaHours: z.number().int().nullable(),
  formSchema: z.record(z.unknown()).nullable(),
  approvalFlow: z.enum(["none", "single", "sequential", "parallel"]),
  approverRoleIds: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("CatalogItem");

const ServiceRequestSchema = z.object({
  id: z.string().uuid(),
  catalogItemId: z.string().uuid(),
  requesterId: z.string(),
  status: z.string(),
  formData: z.record(z.unknown()).nullable(),
  assignedTeamId: z.string().uuid().nullable(),
  assignedToId: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("ServiceRequest");

const CommentSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
}).openapi("Comment");

const ServiceRequestWithCommentsSchema = ServiceRequestSchema.extend({
  comments: z.array(CommentSchema),
}).openapi("ServiceRequestWithComments");

registry.registerPath({
  method: "get",
  path: "/api/catalog-items",
  summary: "List catalog items",
  tags: ["Catalog"],
  responses: {
    200: { description: "List of active catalog items", content: { "application/json": { schema: z.array(CatalogItemSchema) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/catalog-items/{id}",
  summary: "Get catalog item by id",
  tags: ["Catalog"],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Catalog item", content: { "application/json": { schema: CatalogItemSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/catalog-items",
  summary: "Create catalog item",
  tags: ["Catalog"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createCatalogItemSchema.openapi("CreateCatalogItemBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: CatalogItemSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/service-requests",
  summary: "Create service request",
  tags: ["Service Requests"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createServiceRequestSchema.openapi("CreateServiceRequestBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: ServiceRequestSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Catalog item not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/service-requests",
  summary: "List service requests",
  tags: ["Service Requests"],
  responses: {
    200: { description: "List of service requests", content: { "application/json": { schema: z.array(ServiceRequestSchema) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/service-requests/{id}",
  summary: "Get service request by id (with comments)",
  tags: ["Service Requests"],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Service request with comments", content: { "application/json": { schema: ServiceRequestWithCommentsSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/service-requests/{id}/submit",
  summary: "Submit service request (Draft → Submitted)",
  tags: ["Service Requests"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Submitted", content: { "application/json": { schema: ServiceRequestSchema } } },
    400: { description: "Invalid transition", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/service-requests/{id}/comments",
  summary: "Add comment to service request",
  tags: ["Service Requests"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: addRequestCommentSchema.openapi("AddCommentBody") } } },
  },
  responses: {
    201: { description: "Comment added", content: { "application/json": { schema: CommentSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createRequestOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Request Service API",
      version: "1.0.0",
      description: "Service catalog (RF-6.1) and service requests with approval workflow (RF-6.2).",
    },
    servers: [{ url: serverUrl }],
  });
  const docObj = doc as { components?: { securitySchemes?: object } };
  if (!docObj.components) {
    docObj.components = {};
  }
  docObj.components.securitySchemes = {
    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  };
  return doc;
}
