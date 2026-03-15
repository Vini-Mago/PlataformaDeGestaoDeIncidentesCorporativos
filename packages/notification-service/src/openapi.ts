import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createNotificationSchema } from "./application/dtos/create-notification.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["email", "in_app", "push"]),
  recipient: z.string(),
  subject: z.string(),
  body: z.string().nullable(),
  createdAt: z.string().datetime(),
}).openapi("Notification");

registry.registerPath({
  method: "post",
  path: "/api/notifications",
  summary: "Create notification",
  tags: ["Notifications"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createNotificationSchema.openapi("CreateNotificationBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: NotificationSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/notifications",
  summary: "List notifications",
  tags: ["Notifications"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of notifications", content: { "application/json": { schema: z.array(NotificationSchema) } } },
    400: { description: "Invalid filter", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/notifications/{id}",
  summary: "Get notification by id",
  tags: ["Notifications"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Notification", content: { "application/json": { schema: NotificationSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createNotificationOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Notification Service API",
      version: "1.0.0",
      description: "Notifications: create, list and get by id. Types: email, in_app, push.",
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
