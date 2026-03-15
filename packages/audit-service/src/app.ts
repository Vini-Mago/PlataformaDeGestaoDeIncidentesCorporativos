import express, { type Express } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { createAuditOpenApi } from "./openapi";
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  createErrorHandlerMiddleware,
  createHealthHandler,
} from "@pgic/shared";
import type { HttpErrorMapping } from "@pgic/shared";

export interface AuditAppContainer {
  routes: ReturnType<typeof import("./adapters/driving/http/routes").createRoutes>;
  mapApplicationErrorToHttp: (error: unknown) => { statusCode: number; message: string };
}

export interface CreateAppOptions {
  corsOrigin?: string;
  baseUrl?: string;
}

export function createApp(
  container: AuditAppContainer,
  options: CreateAppOptions = {}
): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);

  if (options.corsOrigin) {
    const origins = options.corsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
    if (origins.includes("*") && origins.length > 1) {
      throw new Error("Invalid CORS config: cannot mix '*' with other origins");
    }
    app.use(cors(origins.length === 1 && origins[0] === "*" ? { origin: "*" } : { origin: origins, credentials: true }));
  }
  app.use(express.json({ limit: "512kb" }));

  if (options.baseUrl) {
    const openApiSpec = createAuditOpenApi(options.baseUrl);
    app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, { customSiteTitle: "Audit Service API" })
    );
  }

  app.use("/api", container.routes);
  app.get("/health", createHealthHandler("audit-service"));

  const errorMapper = (err: unknown): HttpErrorMapping =>
    container.mapApplicationErrorToHttp(err);
  app.use(createErrorHandlerMiddleware(errorMapper));

  return app;
}
