import { logger } from "@pgic/shared";
import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import {
  PrismaIntegrationLogRepository,
  PrismaOutboxWriter,
} from "./adapters/driven/persistence/prisma-integration-log.repository";
import { RabbitMqIntegrationEventPublisherAdapter } from "./adapters/driven/messaging/rabbitmq-integration-event-publisher.adapter";
import { OutboxRelayAdapter } from "./adapters/driven/messaging/outbox-relay.adapter";
import { ProcessMonitoringWebhookUseCase } from "./application/use-cases/process-monitoring-webhook.use-case";
import { ListIntegrationLogsUseCase } from "./application/use-cases/list-integration-logs.use-case";
import { IntegrationController } from "./adapters/driving/http/integration.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface IntegrationContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  rabbitmqUrl?: string;
  webhookApiKey: string;
  webhookSecret?: string;
  systemUserId: string;
}

interface IntegrationCradle {
  config: IntegrationContainerConfig;
  prisma: PrismaClient;
  integrationLogRepository: PrismaIntegrationLogRepository;
  outboxWriter: PrismaOutboxWriter;
  eventPublisher: RabbitMqIntegrationEventPublisherAdapter | { connect: () => Promise<void>; publish: () => Promise<void>; disconnect: () => Promise<void> };
  outboxRelay: OutboxRelayAdapter;
  processMonitoringWebhookUseCase: ProcessMonitoringWebhookUseCase;
  listIntegrationLogsUseCase: ListIntegrationLogsUseCase;
  integrationController: IntegrationController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: IntegrationContainerConfig) {
  const awilix = createAwilixContainer<IntegrationCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config: c }: { config: IntegrationContainerConfig }) =>
      new PrismaClient({ datasources: { db: { url: c.databaseUrl } } })
    ).singleton(),

    integrationLogRepository: asFunction(
      (cradle: IntegrationCradle) => new PrismaIntegrationLogRepository(cradle.prisma)
    ).singleton(),

    outboxWriter: asFunction(
      (cradle: IntegrationCradle) => new PrismaOutboxWriter(cradle.prisma)
    ).singleton(),

    eventPublisher: asFunction(({ config: c }: { config: IntegrationContainerConfig }) => {
      if (!c.rabbitmqUrl) {
        return {
          connect: async () => {},
          publish: async () => {},
          disconnect: async () => {},
        };
      }
      return new RabbitMqIntegrationEventPublisherAdapter(c.rabbitmqUrl);
    }).singleton(),

    outboxRelay: asFunction(
      (cradle: IntegrationCradle) =>
        new OutboxRelayAdapter(cradle.prisma, cradle.eventPublisher as { publish: (n: string, p: object) => Promise<void> })
    ).singleton(),

    processMonitoringWebhookUseCase: asFunction(
      (cradle: IntegrationCradle) =>
        new ProcessMonitoringWebhookUseCase(cradle.integrationLogRepository, cradle.outboxWriter)
    ).singleton(),

    listIntegrationLogsUseCase: asFunction(
      (cradle: IntegrationCradle) =>
        new ListIntegrationLogsUseCase(cradle.integrationLogRepository)
    ).singleton(),

    integrationController: asFunction(
      (cradle: IntegrationCradle) =>
        new IntegrationController(
          cradle.processMonitoringWebhookUseCase,
          cradle.listIntegrationLogsUseCase,
          cradle.config.systemUserId
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config: c }: { config: IntegrationContainerConfig }) =>
      new JwtTokenVerifier(c.jwtSecret)
    ).singleton(),

    authMiddleware: asFunction(({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
      createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction((cradle: IntegrationCradle) =>
      createRoutes(cradle.integrationController, cradle.authMiddleware, {
        apiKey: cradle.config.webhookApiKey,
        webhookSecret: cradle.config.webhookSecret,
      })
    ).singleton(),
  });

  const c = awilix.cradle;

  return {
    get routes() {
      return c.routes;
    },
    mapApplicationErrorToHttp,
    get outboxRelay() {
      return c.outboxRelay;
    },
    async connectRabbitMQ(): Promise<void> {
      if (c.config.rabbitmqUrl && "connect" in c.eventPublisher) {
        await (c.eventPublisher as RabbitMqIntegrationEventPublisherAdapter).connect();
      }
    },
    startOutboxRelay(intervalMs = 2_000): void {
      c.outboxRelay.start(intervalMs);
    },
    async disconnect(): Promise<void> {
      try {
        if (c.config.rabbitmqUrl && "disconnect" in c.eventPublisher) {
          await (c.eventPublisher as RabbitMqIntegrationEventPublisherAdapter).disconnect();
        }
      } catch (err) {
        logger.error({ err }, "integration eventPublisher disconnect failed");
      }
      try {
        c.outboxRelay.stop();
      } catch (err) {
        logger.error({ err }, "integration outboxRelay stop failed");
      }
      try {
        await c.prisma.$disconnect();
      } catch (err) {
        logger.error({ err }, "integration prisma disconnect failed");
      }
    },
  };
}
