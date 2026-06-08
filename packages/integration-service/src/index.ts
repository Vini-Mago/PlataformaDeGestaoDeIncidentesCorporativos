import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

import type { Server } from "http";
import { createContainer } from "./container";
import { createApp } from "./app";
import { logger } from "@pgic/shared";

const port = parseInt(process.env.INTEGRATION_SERVICE_PORT ?? "3011", 10);
const isProduction = process.env.NODE_ENV === "production";

const databaseUrl = isProduction
  ? process.env.INTEGRATION_DATABASE_URL!
  : (process.env.INTEGRATION_DATABASE_URL ??
    "postgresql://pgic:pgic@localhost:5432/integration_service");

const jwtSecret =
  process.env.JWT_SECRET ?? (isProduction ? "" : "dev-secret-min-32-chars-for-jwt-signing");

const webhookApiKey =
  process.env.INTEGRATION_WEBHOOK_API_KEY ?? "dev-integration-webhook-key";

const systemUserId =
  process.env.INTEGRATION_SYSTEM_USER_ID ?? "00000000-0000-4000-8000-000000000001";

const webhookAllowedIps = (process.env.INTEGRATION_WEBHOOK_ALLOWED_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

async function bootstrap() {
  const container = createContainer({
    databaseUrl,
    jwtSecret,
    rabbitmqUrl: process.env.RABBITMQ_URL,
    webhookApiKey,
    webhookSecret: process.env.INTEGRATION_WEBHOOK_SECRET,
    webhookAllowedIps,
    systemUserId,
    incidentServiceUrl: process.env.INCIDENT_SERVICE_BASE_URL ?? "http://localhost:3204",
  });

  const baseUrl = process.env.INTEGRATION_SERVICE_URL ?? `http://localhost:${port}`;
  const app = createApp(container, {
    corsOrigin: process.env.CORS_ORIGIN,
    baseUrl,
    metricsToken: process.env.METRICS_TOKEN,
  });
  const server: Server = app.listen(port, () => {
    logger.info(`Integration service listening on http://localhost:${port}`);
  });

  if (process.env.RABBITMQ_URL) {
    try {
      await container.connectRabbitMQ();
      const intervalMs = parseInt(process.env.OUTBOX_RELAY_INTERVAL_MS ?? "2000", 10);
      container.startOutboxRelay(intervalMs > 0 ? intervalMs : 2000);
    } catch (err) {
      if (isProduction) throw err;
      logger.warn({ err }, "integration-service: RabbitMQ unavailable in dev");
    }
  }

  process.on("SIGTERM", () => {
    server.close(() => {
      container.disconnect().finally(() => process.exit(0));
    });
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start integration-service");
  process.exit(1);
});
