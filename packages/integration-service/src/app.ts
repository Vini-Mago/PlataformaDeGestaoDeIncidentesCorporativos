import express, { type Express } from "express";
import cors from "cors";
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  createErrorHandlerMiddleware,
  createHealthHandler,
  createMetricsHandler,
  createMetricsMiddleware,
} from "@pgic/shared";
import type { HttpErrorMapping } from "@pgic/shared";
import swaggerUi from "swagger-ui-express";
import { createIntegrationOpenApi } from "./openapi";

export interface IntegrationAppContainer {
  routes: ReturnType<typeof import("./adapters/driving/http/routes").createRoutes>;
  mapApplicationErrorToHttp: (error: unknown) => { statusCode: number; message: string };
}

export function createApp(
  container: IntegrationAppContainer,
  options: { corsOrigin?: string; baseUrl?: string } = {}
): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(createMetricsMiddleware("integration-service"));

  if (options.corsOrigin) {
    const origins = options.corsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
    app.use(
      cors(
        origins.length === 1 && origins[0] === "*"
          ? { origin: "*" }
          : { origin: origins, credentials: true }
      )
    );
  }

  app.use(
    express.json({
      limit: "256kb",
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    })
  );

  if (options.baseUrl) {
    const openApiSpec = createIntegrationOpenApi(options.baseUrl);
    app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, { customSiteTitle: "Integration Service API" })
    );
  }

  app.use("/api", container.routes);
  app.get("/health", createHealthHandler("integration-service"));
  app.get("/metrics", createMetricsHandler("integration-service"));

  const errorMapper = (err: unknown): HttpErrorMapping =>
    container.mapApplicationErrorToHttp(err);
  app.use(createErrorHandlerMiddleware(errorMapper));

  return app;
}
