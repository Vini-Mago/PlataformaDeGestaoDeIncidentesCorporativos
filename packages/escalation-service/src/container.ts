import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaEscalationRuleRepository } from "./adapters/driven/persistence/prisma-escalation-rule.repository";
import { CreateEscalationRuleUseCase } from "./application/use-cases/create-escalation-rule.use-case";
import { ListEscalationRulesUseCase } from "./application/use-cases/list-escalation-rules.use-case";
import { GetEscalationRuleUseCase } from "./application/use-cases/get-escalation-rule.use-case";
import { EscalationController } from "./adapters/driving/http/escalation.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";
import { PrismaEscalationHistoryRepository } from "./adapters/driven/persistence/prisma-escalation-history.repository";
import { HandleEscalationDomainEventUseCase } from "./application/use-cases/handle-escalation-domain-event.use-case";
import { RabbitMqEscalationEventsConsumer } from "./adapters/driving/messaging/rabbitmq-escalation-events.consumer";
import { logger } from "@pgic/shared";

export interface EscalationContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  rabbitmqUrl?: string;
}

interface EscalationCradle {
  config: EscalationContainerConfig;
  prisma: PrismaClient;
  escalationRuleRepository: PrismaEscalationRuleRepository;
  escalationHistoryRepository: PrismaEscalationHistoryRepository;
  handleEscalationDomainEventUseCase: HandleEscalationDomainEventUseCase;
  escalationEventsConsumer: RabbitMqEscalationEventsConsumer | null;
  createEscalationRuleUseCase: CreateEscalationRuleUseCase;
  listEscalationRulesUseCase: ListEscalationRulesUseCase;
  getEscalationRuleUseCase: GetEscalationRuleUseCase;
  escalationController: EscalationController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: EscalationContainerConfig) {
  const awilix = createAwilixContainer<EscalationCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: EscalationContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    escalationRuleRepository: asFunction(
      (cradle: EscalationCradle) => new PrismaEscalationRuleRepository(cradle.prisma)
    ).singleton(),

    escalationHistoryRepository: asFunction(
      (cradle: EscalationCradle) => new PrismaEscalationHistoryRepository(cradle.prisma)
    ).singleton(),

    handleEscalationDomainEventUseCase: asFunction(
      (cradle: EscalationCradle) =>
        new HandleEscalationDomainEventUseCase(
          cradle.escalationRuleRepository,
          cradle.escalationHistoryRepository
        )
    ).singleton(),

    escalationEventsConsumer: asFunction((cradle: EscalationCradle) => {
      if (!cradle.config.rabbitmqUrl) return null;
      return new RabbitMqEscalationEventsConsumer(
        cradle.config.rabbitmqUrl,
        cradle.handleEscalationDomainEventUseCase
      );
    }).singleton(),

    createEscalationRuleUseCase: asFunction(
      (cradle: EscalationCradle) =>
        new CreateEscalationRuleUseCase(cradle.escalationRuleRepository)
    ).singleton(),

    listEscalationRulesUseCase: asFunction(
      (cradle: EscalationCradle) =>
        new ListEscalationRulesUseCase(cradle.escalationRuleRepository)
    ).singleton(),

    getEscalationRuleUseCase: asFunction(
      (cradle: EscalationCradle) =>
        new GetEscalationRuleUseCase(cradle.escalationRuleRepository)
    ).singleton(),

    escalationController: asFunction(
      (cradle: EscalationCradle) =>
        new EscalationController(
          cradle.createEscalationRuleUseCase,
          cradle.listEscalationRulesUseCase,
          cradle.getEscalationRuleUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: EscalationContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: EscalationCradle) =>
        createRoutes(cradle.escalationController, cradle.authMiddleware)
    ).singleton(),
  });

  const c = awilix.cradle;

  return {
    get prisma() {
      return c.prisma;
    },
    get routes() {
      return c.routes;
    },
    mapApplicationErrorToHttp,
    get escalationEventsConsumer() {
      return c.escalationEventsConsumer;
    },
    async disconnect(): Promise<void> {
      try {
        if (c.escalationEventsConsumer) await c.escalationEventsConsumer.stop();
      } catch (err) {
        logger.error({ err }, "escalationEventsConsumer.stop failed");
      }
      try {
        await c.prisma.$disconnect();
      } catch (err) {
        logger.error({ err }, "Error disconnecting Prisma client");
      }
    },
  };
}
