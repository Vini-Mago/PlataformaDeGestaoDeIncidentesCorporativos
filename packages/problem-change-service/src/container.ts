import { logger } from "@pgic/shared";
import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaProblemRepository } from "./adapters/driven/persistence/prisma-problem.repository";
import { PrismaChangeRepository } from "./adapters/driven/persistence/prisma-change.repository";
import { PrismaReplicatedUserStore } from "./adapters/driven/persistence/prisma-replicated-user.store";
import { RabbitMqProblemChangeEventPublisherAdapter } from "./adapters/driven/messaging/rabbitmq-problem-change-event-publisher.adapter";
import { OutboxRelayAdapter } from "./adapters/driven/messaging/outbox-relay.adapter";
import { RabbitMqUserCreatedConsumer } from "./adapters/driving/messaging/rabbitmq-user-created.consumer";
import { CreateProblemUseCase } from "./application/use-cases/create-problem.use-case";
import { ListProblemsUseCase } from "./application/use-cases/list-problems.use-case";
import { GetProblemUseCase } from "./application/use-cases/get-problem.use-case";
import { CreateChangeUseCase } from "./application/use-cases/create-change.use-case";
import { ListChangesUseCase } from "./application/use-cases/list-changes.use-case";
import { GetChangeUseCase } from "./application/use-cases/get-change.use-case";
import { HandleUserCreatedUseCase } from "./application/use-cases/handle-user-created.use-case";
import { ProblemChangeController } from "./adapters/driving/http/problem-change.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface ProblemChangeContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  rabbitmqUrl?: string;
}

interface ProblemChangeCradle {
  config: ProblemChangeContainerConfig;
  prisma: PrismaClient;
  problemRepository: PrismaProblemRepository;
  changeRepository: PrismaChangeRepository;
  replicatedUserStore: PrismaReplicatedUserStore;
  eventPublisher: RabbitMqProblemChangeEventPublisherAdapter;
  outboxRelay: OutboxRelayAdapter;
  createProblemUseCase: CreateProblemUseCase;
  listProblemsUseCase: ListProblemsUseCase;
  getProblemUseCase: GetProblemUseCase;
  createChangeUseCase: CreateChangeUseCase;
  listChangesUseCase: ListChangesUseCase;
  getChangeUseCase: GetChangeUseCase;
  handleUserCreatedUseCase: HandleUserCreatedUseCase;
  userCreatedConsumer: RabbitMqUserCreatedConsumer | null;
  problemChangeController: ProblemChangeController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: ProblemChangeContainerConfig) {
  const awilix = createAwilixContainer<ProblemChangeCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: ProblemChangeContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    problemRepository: asFunction(
      (cradle: ProblemChangeCradle) => new PrismaProblemRepository(cradle.prisma)
    ).singleton(),

    changeRepository: asFunction(
      (cradle: ProblemChangeCradle) => new PrismaChangeRepository(cradle.prisma)
    ).singleton(),

    replicatedUserStore: asFunction(
      (cradle: ProblemChangeCradle) => new PrismaReplicatedUserStore(cradle.prisma)
    ).singleton(),

    eventPublisher: asFunction(
      ({ config }: { config: ProblemChangeContainerConfig }) => {
        if (!config.rabbitmqUrl) {
          return {
            connect: async () => {},
            publish: async () => {},
            disconnect: async () => {},
          };
        }
        return new RabbitMqProblemChangeEventPublisherAdapter(config.rabbitmqUrl);
      }
    ).singleton(),

    outboxRelay: asFunction(
      (cradle: ProblemChangeCradle) =>
        new OutboxRelayAdapter(cradle.prisma, cradle.eventPublisher as { publish: (n: string, p: object) => Promise<void> })
    ).singleton(),

    createProblemUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new CreateProblemUseCase(cradle.problemRepository)
    ).singleton(),

    listProblemsUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new ListProblemsUseCase(cradle.problemRepository)
    ).singleton(),

    getProblemUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new GetProblemUseCase(cradle.problemRepository)
    ).singleton(),

    createChangeUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new CreateChangeUseCase(cradle.changeRepository)
    ).singleton(),

    listChangesUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new ListChangesUseCase(cradle.changeRepository)
    ).singleton(),

    getChangeUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new GetChangeUseCase(cradle.changeRepository)
    ).singleton(),

    handleUserCreatedUseCase: asFunction(
      (cradle: ProblemChangeCradle) =>
        new HandleUserCreatedUseCase(cradle.replicatedUserStore)
    ).singleton(),

    userCreatedConsumer: asFunction((cradle: ProblemChangeCradle) => {
      const url = cradle.config.rabbitmqUrl;
      if (!url) return null;
      return new RabbitMqUserCreatedConsumer(url, cradle.handleUserCreatedUseCase);
    }).singleton(),

    problemChangeController: asFunction(
      (cradle: ProblemChangeCradle) =>
        new ProblemChangeController(
          cradle.createProblemUseCase,
          cradle.listProblemsUseCase,
          cradle.getProblemUseCase,
          cradle.createChangeUseCase,
          cradle.listChangesUseCase,
          cradle.getChangeUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: ProblemChangeContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: ProblemChangeCradle) =>
        createRoutes(cradle.problemChangeController, cradle.authMiddleware)
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
    get eventPublisher() {
      return c.eventPublisher;
    },
    get outboxRelay() {
      return c.outboxRelay;
    },
    get userCreatedConsumer() {
      return c.userCreatedConsumer;
    },
    async connectRabbitMQ(): Promise<void> {
      if (c.config.rabbitmqUrl && "connect" in c.eventPublisher && typeof c.eventPublisher.connect === "function") {
        await c.eventPublisher.connect();
      }
    },
    startOutboxRelay(intervalMs: number = 2_000): void {
      c.outboxRelay.start(intervalMs);
    },
    async disconnect(): Promise<void> {
      try {
        if (c.userCreatedConsumer) await c.userCreatedConsumer.stop();
      } catch (err) {
        logger.error({ err }, "userCreatedConsumer.stop() failed on disconnect");
      }
      try {
        if (c.config.rabbitmqUrl && "disconnect" in c.eventPublisher && typeof c.eventPublisher.disconnect === "function") {
          await c.eventPublisher.disconnect();
        }
      } catch (err) {
        logger.error({ err }, "eventPublisher.disconnect() failed on disconnect");
      }
      try {
        c.outboxRelay.stop();
      } catch (err) {
        logger.error({ err }, "outboxRelay.stop() failed on disconnect");
      }
      try {
        await c.prisma.$disconnect();
      } catch (err) {
        logger.error({ err }, "prisma.$disconnect() failed on disconnect");
      }
    },
  };
}
