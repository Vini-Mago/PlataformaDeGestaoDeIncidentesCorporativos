import { logger } from "@pgic/shared";
import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaIncidentRepository } from "./adapters/driven/persistence/prisma-incident.repository";
import { PrismaReplicatedUserStore } from "./adapters/driven/persistence/prisma-replicated-user.store";
import { RabbitMqIncidentEventPublisherAdapter } from "./adapters/driven/messaging/rabbitmq-incident-event-publisher.adapter";
import { OutboxRelayAdapter } from "./adapters/driven/messaging/outbox-relay.adapter";
import { RabbitMqUserCreatedConsumer } from "./adapters/driving/messaging/rabbitmq-user-created.consumer";
import { CreateIncidentUseCase } from "./application/use-cases/create-incident.use-case";
import { ListIncidentsUseCase } from "./application/use-cases/list-incidents.use-case";
import { GetIncidentUseCase } from "./application/use-cases/get-incident.use-case";
import { ChangeIncidentStatusUseCase } from "./application/use-cases/change-incident-status.use-case";
import { AssignIncidentUseCase } from "./application/use-cases/assign-incident.use-case";
import { AddIncidentCommentUseCase } from "./application/use-cases/add-incident-comment.use-case";
import { HandleUserCreatedUseCase } from "./application/use-cases/handle-user-created.use-case";
import { IncidentController } from "./adapters/driving/http/incident.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface IncidentContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  rabbitmqUrl?: string;
}

interface IncidentCradle {
  config: IncidentContainerConfig;
  prisma: PrismaClient;
  incidentRepository: PrismaIncidentRepository;
  replicatedUserStore: PrismaReplicatedUserStore;
  eventPublisher: RabbitMqIncidentEventPublisherAdapter;
  outboxRelay: OutboxRelayAdapter;
  createIncidentUseCase: CreateIncidentUseCase;
  listIncidentsUseCase: ListIncidentsUseCase;
  getIncidentUseCase: GetIncidentUseCase;
  changeIncidentStatusUseCase: ChangeIncidentStatusUseCase;
  assignIncidentUseCase: AssignIncidentUseCase;
  addIncidentCommentUseCase: AddIncidentCommentUseCase;
  handleUserCreatedUseCase: HandleUserCreatedUseCase;
  userCreatedConsumer: RabbitMqUserCreatedConsumer | null;
  incidentController: IncidentController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: IncidentContainerConfig) {
  const awilix = createAwilixContainer<IncidentCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: IncidentContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    incidentRepository: asFunction(
      (cradle: IncidentCradle) => new PrismaIncidentRepository(cradle.prisma)
    ).singleton(),

    replicatedUserStore: asFunction(
      (cradle: IncidentCradle) => new PrismaReplicatedUserStore(cradle.prisma)
    ).singleton(),

    eventPublisher: asFunction(
      ({ config }: { config: IncidentContainerConfig }) => {
        if (!config.rabbitmqUrl) {
          return {
            connect: async () => {},
            publish: async () => {},
            disconnect: async () => {},
          };
        }
        return new RabbitMqIncidentEventPublisherAdapter(config.rabbitmqUrl);
      }
    ).singleton(),

    outboxRelay: asFunction(
      (cradle: IncidentCradle) =>
        new OutboxRelayAdapter(cradle.prisma, cradle.eventPublisher as { publish: (n: string, p: object) => Promise<void> })
    ).singleton(),

    createIncidentUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new CreateIncidentUseCase(cradle.incidentRepository)
    ).singleton(),

    listIncidentsUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new ListIncidentsUseCase(cradle.incidentRepository)
    ).singleton(),

    getIncidentUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new GetIncidentUseCase(cradle.incidentRepository)
    ).singleton(),

    changeIncidentStatusUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new ChangeIncidentStatusUseCase(cradle.incidentRepository)
    ).singleton(),

    assignIncidentUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new AssignIncidentUseCase(cradle.incidentRepository)
    ).singleton(),

    addIncidentCommentUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new AddIncidentCommentUseCase(cradle.incidentRepository)
    ).singleton(),

    handleUserCreatedUseCase: asFunction(
      (cradle: IncidentCradle) =>
        new HandleUserCreatedUseCase(cradle.replicatedUserStore)
    ).singleton(),

    userCreatedConsumer: asFunction((cradle: IncidentCradle) => {
      const url = cradle.config.rabbitmqUrl;
      if (!url) return null;
      return new RabbitMqUserCreatedConsumer(url, cradle.handleUserCreatedUseCase);
    }).singleton(),

    incidentController: asFunction(
      (cradle: IncidentCradle) =>
        new IncidentController(
          cradle.createIncidentUseCase,
          cradle.listIncidentsUseCase,
          cradle.getIncidentUseCase,
          cradle.changeIncidentStatusUseCase,
          cradle.assignIncidentUseCase,
          cradle.addIncidentCommentUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: IncidentContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: IncidentCradle) =>
        createRoutes(cradle.incidentController, cradle.authMiddleware)
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
