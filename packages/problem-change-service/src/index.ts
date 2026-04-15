import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

import type { Server } from "http";
import { createContainer } from "./container";
import { createApp } from "./app";
import { logger } from "@pgic/shared";

const port = parseInt(process.env.PROBLEM_CHANGE_SERVICE_PORT ?? "3005", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logger.error("PROBLEM_CHANGE_SERVICE_PORT must be a valid port (1-65535)");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.PROBLEM_CHANGE_DATABASE_URL) {
  logger.error("PROBLEM_CHANGE_DATABASE_URL must be set in production");
  process.exit(1);
}

const databaseUrl = isProduction
  ? process.env.PROBLEM_CHANGE_DATABASE_URL!
  : (process.env.PROBLEM_CHANGE_DATABASE_URL ?? "postgresql://pgic:pgic@localhost:5432/problem_change_service");
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  logger.error("JWT_SECRET must be set and at least 32 characters in production");
  process.exit(1);
}
const jwtSecret = process.env.JWT_SECRET ?? (isProduction ? "" : "dev-secret-min-32-chars-for-jwt-signing");
const rabbitmqUrl = process.env.RABBITMQ_URL;
const baseUrl = process.env.PROBLEM_CHANGE_SERVICE_URL ?? `http://localhost:${port}`;
const rabbitmqConnectRetries = parseInt(process.env.RABBITMQ_CONNECT_RETRIES ?? (isProduction ? "12" : "20"), 10);
const rabbitmqConnectRetryDelayMs = parseInt(process.env.RABBITMQ_CONNECT_RETRY_DELAY_MS ?? "1500", 10);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectRabbitMQWithRetry(connect: () => Promise<void>): Promise<boolean> {
  for (let attempt = 1; attempt <= rabbitmqConnectRetries; attempt += 1) {
    try {
      await connect();
      if (attempt > 1) {
        logger.info({ attempt }, "problem-change-service: RabbitMQ connected after retry");
      }
      return true;
    } catch (err) {
      const isLastAttempt = attempt >= rabbitmqConnectRetries;
      if (isLastAttempt) {
        if (isProduction) throw err;
        logger.warn(
          { err, attempts: rabbitmqConnectRetries },
          "problem-change-service: RabbitMQ unavailable in development; continuing with messaging disabled"
        );
        return false;
      }
      logger.warn(
        { err, attempt, retryInMs: rabbitmqConnectRetryDelayMs },
        "problem-change-service: RabbitMQ connection failed; retrying"
      );
      await sleep(rabbitmqConnectRetryDelayMs);
    }
  }
  return false;
}

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
    logger.info(`Problem-change service listening on http://localhost:${port}`);
  });

  if (rabbitmqUrl) {
    const rabbitConnected = await connectRabbitMQWithRetry(async () => container.connectRabbitMQ());
    if (rabbitConnected) {
      const outboxRelayIntervalMs = parseInt(process.env.OUTBOX_RELAY_INTERVAL_MS ?? "2000", 10);
      container.startOutboxRelay(Number.isInteger(outboxRelayIntervalMs) && outboxRelayIntervalMs > 0 ? outboxRelayIntervalMs : 2000);

      if (container.userCreatedConsumer) {
        container.userCreatedConsumer.start().catch((err) => {
          logger.error({ err }, "Failed to start user.created consumer; replication disabled until restart");
        });
      }
    }
  } else {
    logger.info("RABBITMQ_URL not set; Outbox relay and user replication disabled");
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
  logger.error({ err }, "Failed to start problem-change-service");
  process.exit(1);
});
