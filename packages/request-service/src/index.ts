import path from "path";
import { config as loadEnv } from "dotenv";

// Load root .env first (RABBITMQ_URL, etc.); service .env overrides with override: true.
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });
loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });

import type { Server } from "http";
import { createContainer } from "./container";
import { createApp } from "./app";
import { logger } from "@pgic/shared";

const port = parseInt(process.env.REQUEST_SERVICE_PORT ?? "3002", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logger.error("REQUEST_SERVICE_PORT must be a valid port (1-65535)");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.REQUEST_DATABASE_URL) {
  logger.error("REQUEST_DATABASE_URL must be set in production");
  process.exit(1);
}

const databaseUrl = isProduction
  ? process.env.REQUEST_DATABASE_URL!
  : (process.env.REQUEST_DATABASE_URL ?? "postgresql://pgic:pgic@localhost:5432/request_service");
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  logger.error("JWT_SECRET must be set and at least 32 characters in production");
  process.exit(1);
}
const jwtSecret = process.env.JWT_SECRET ?? (isProduction ? "" : "dev-secret-min-32-chars-for-jwt-signing");
const rabbitmqUrl = process.env.RABBITMQ_URL;
const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

async function bootstrap() {
  const container = createContainer({
    databaseUrl,
    jwtSecret,
    rabbitmqUrl,
  });

  const app = createApp(container, {
    baseUrl,
    corsOrigin: process.env.CORS_ORIGIN,
  });

  const server: Server = app.listen(port, () => {
    logger.info(`Request service listening on http://localhost:${port}`);
  });

  if (rabbitmqUrl) {
    if (container.userCreatedConsumer) {
      container.userCreatedConsumer.start().catch((err) => {
        logger.error({ err }, "Failed to start user.created consumer; replication disabled until restart");
      });
    }
    if (container.userUpdatedConsumer) {
      container.userUpdatedConsumer.start().catch((err) => {
        logger.error({ err }, "Failed to start user.updated consumer; replication may be stale until restart");
      });
    }
    const missing: string[] = [];
    if (!container.userCreatedConsumer) missing.push("userCreatedConsumer");
    if (!container.userUpdatedConsumer) missing.push("userUpdatedConsumer");
    if (missing.length > 0) {
      logger.warn(
        { missing },
        "RABBITMQ_URL set but one or more consumers not configured; replication may be incomplete until restart"
      );
    }
  } else {
    logger.info("RABBITMQ_URL not set; user replication (user.created/user.updated consumers) disabled");
  }

  const shutdownTimeoutMs = 10_000;
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down");
    server.close((closeErr) => {
      if (closeErr) logger.error({ err: closeErr }, "HTTP server close error");
      container
        .disconnect()
        .then(() => {
          logger.info("Shutdown complete");
          process.exit(0);
        })
        .catch((err) => {
          logger.error({ err }, "Disconnect failed on SIGTERM");
          process.exit(1);
        });
    });
    setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, shutdownTimeoutMs).unref();
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start request-service");
  process.exit(1);
});
