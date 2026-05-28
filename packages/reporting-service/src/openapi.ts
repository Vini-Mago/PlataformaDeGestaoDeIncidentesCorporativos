import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createReportDefinitionSchema } from "./application/dtos/create-report-definition.dto";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const ErrorSchema = z.object({ error: z.string(), message: z.string() }).openapi("Error");

const ReportDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  reportType: z.enum(["incidents_summary", "kpi_dashboard", "sla_compliance", "custom"]),
  filters: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi("ReportDefinition");

registry.registerPath({
  method: "post",
  path: "/api/report-definitions",
  summary: "Create report definition",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createReportDefinitionSchema.openapi("CreateReportDefinitionBody") } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: ReportDefinitionSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const ReportDefinitionsQuerySchema = z.object({
  reportType: z.enum(["incidents_summary", "kpi_dashboard", "sla_compliance", "custom"]).optional(),
}).openapi("ReportDefinitionsQuery");

const ReportExportJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  format: z.literal("csv"),
  fileName: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
}).openapi("ReportExportJob");

const ReportExportJobAcceptedSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  createdAt: z.string().datetime(),
}).openapi("ReportExportJobAccepted");

registry.registerPath({
  method: "get",
  path: "/api/report-definitions",
  summary: "List report definitions",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { query: ReportDefinitionsQuerySchema },
  responses: {
    200: { description: "List of report definitions", content: { "application/json": { schema: z.array(ReportDefinitionSchema) } } },
    400: { description: "Invalid filter", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/report-definitions/export.csv",
  summary: "Export report definitions as CSV",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { query: ReportDefinitionsQuerySchema },
  responses: {
    200: {
      description: "CSV export",
      content: { "text/csv": { schema: z.string() } },
    },
    400: { description: "Invalid filter", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/report-definitions/export-jobs",
  summary: "Request asynchronous CSV export job",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { query: ReportDefinitionsQuerySchema },
  responses: {
    202: { description: "Accepted", content: { "application/json": { schema: ReportExportJobAcceptedSchema } } },
    400: { description: "Invalid filter", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/report-definitions/export-jobs/{id}",
  summary: "Get export job status",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Export job", content: { "application/json": { schema: ReportExportJobSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/report-definitions/export-jobs/{id}/download",
  summary: "Download export file when job is completed",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "CSV file", content: { "text/csv": { schema: z.string() } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Job not completed", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/report-definitions/{id}",
  summary: "Get report definition by id",
  tags: ["Report Definitions"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Report definition", content: { "application/json": { schema: ReportDefinitionSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function createReportingOpenApi(serverUrl: string): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Reporting Service API",
      version: "1.0.0",
      description: "RF-4.x: KPIs, dashboards, report definitions and export.",
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
