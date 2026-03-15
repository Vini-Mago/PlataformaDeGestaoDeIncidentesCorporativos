import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createCalendarSchema } from "./application/dtos/create-calendar.dto";
import { createSlaPolicySchema } from "./application/dtos/create-sla-policy.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const CalendarSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timezone: z.string(),
  workingDays: z.array(z.number()),
  workStartMinutes: z.number(),
  workEndMinutes: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("Calendar");

const SlaPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ticketType: z.enum(["incident", "request"]),
  criticality: z.string().nullable(),
  serviceId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  responseMinutes: z.number(),
  resolutionMinutes: z.number(),
  calendarId: z.string().uuid(),
  priority: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("SlaPolicy");

registry.registerPath({
  method: "post",
  path: "/api/calendars",
  summary: "Create calendar",
  tags: ["Calendars"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createCalendarSchema.openapi("CreateCalendarBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: CalendarSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/calendars",
  summary: "List calendars",
  tags: ["Calendars"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of calendars", content: { "application/json": { schema: z.array(CalendarSchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/calendars/{id}",
  summary: "Get calendar by id",
  tags: ["Calendars"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Calendar", content: { "application/json": { schema: CalendarSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/sla-policies",
  summary: "Create SLA policy",
  tags: ["SLA Policies"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createSlaPolicySchema.openapi("CreateSlaPolicyBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: SlaPolicySchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Calendar not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/sla-policies",
  summary: "List SLA policies",
  tags: ["SLA Policies"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of SLA policies", content: { "application/json": { schema: z.array(SlaPolicySchema) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/sla-policies/{id}",
  summary: "Get SLA policy by id",
  tags: ["SLA Policies"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "SLA policy", content: { "application/json": { schema: SlaPolicySchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createSlaOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "SLA Service API",
      version: "1.0.0",
      description: "RF-8.x: SLA policies (response/resolution times, conditions) and calendars (working hours, holidays).",
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
