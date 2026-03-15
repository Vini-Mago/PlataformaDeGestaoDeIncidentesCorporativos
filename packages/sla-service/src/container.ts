import { logger } from "@pgic/shared";
import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaCalendarRepository } from "./adapters/driven/persistence/prisma-calendar.repository";
import { PrismaSlaPolicyRepository } from "./adapters/driven/persistence/prisma-sla-policy.repository";
import { RabbitMqSlaEventPublisherAdapter } from "./adapters/driven/messaging/rabbitmq-sla-event-publisher.adapter";
import { OutboxRelayAdapter } from "./adapters/driven/messaging/outbox-relay.adapter";
import { CreateCalendarUseCase } from "./application/use-cases/create-calendar.use-case";
import { ListCalendarsUseCase } from "./application/use-cases/list-calendars.use-case";
import { GetCalendarUseCase } from "./application/use-cases/get-calendar.use-case";
import { CreateSlaPolicyUseCase } from "./application/use-cases/create-sla-policy.use-case";
import { ListSlaPoliciesUseCase } from "./application/use-cases/list-sla-policies.use-case";
import { GetSlaPolicyUseCase } from "./application/use-cases/get-sla-policy.use-case";
import { SlaController } from "./adapters/driving/http/sla.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface SlaContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  rabbitmqUrl?: string;
}

interface SlaCradle {
  config: SlaContainerConfig;
  prisma: PrismaClient;
  calendarRepository: PrismaCalendarRepository;
  slaPolicyRepository: PrismaSlaPolicyRepository;
  eventPublisher: RabbitMqSlaEventPublisherAdapter;
  outboxRelay: OutboxRelayAdapter;
  createCalendarUseCase: CreateCalendarUseCase;
  listCalendarsUseCase: ListCalendarsUseCase;
  getCalendarUseCase: GetCalendarUseCase;
  createSlaPolicyUseCase: CreateSlaPolicyUseCase;
  listSlaPoliciesUseCase: ListSlaPoliciesUseCase;
  getSlaPolicyUseCase: GetSlaPolicyUseCase;
  slaController: SlaController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: SlaContainerConfig) {
  const awilix = createAwilixContainer<SlaCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: SlaContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    calendarRepository: asFunction(
      (cradle: SlaCradle) => new PrismaCalendarRepository(cradle.prisma)
    ).singleton(),

    slaPolicyRepository: asFunction(
      (cradle: SlaCradle) => new PrismaSlaPolicyRepository(cradle.prisma)
    ).singleton(),

    eventPublisher: asFunction(
      ({ config }: { config: SlaContainerConfig }) => {
        if (!config.rabbitmqUrl) {
          return {
            connect: async () => {},
            publish: async () => {},
            disconnect: async () => {},
          };
        }
        return new RabbitMqSlaEventPublisherAdapter(config.rabbitmqUrl);
      }
    ).singleton(),

    outboxRelay: asFunction(
      (cradle: SlaCradle) =>
        new OutboxRelayAdapter(cradle.prisma, cradle.eventPublisher as { publish: (n: string, p: object) => Promise<void> })
    ).singleton(),

    createCalendarUseCase: asFunction(
      (cradle: SlaCradle) =>
        new CreateCalendarUseCase(cradle.calendarRepository)
    ).singleton(),

    listCalendarsUseCase: asFunction(
      (cradle: SlaCradle) =>
        new ListCalendarsUseCase(cradle.calendarRepository)
    ).singleton(),

    getCalendarUseCase: asFunction(
      (cradle: SlaCradle) =>
        new GetCalendarUseCase(cradle.calendarRepository)
    ).singleton(),

    createSlaPolicyUseCase: asFunction(
      (cradle: SlaCradle) =>
        new CreateSlaPolicyUseCase(cradle.slaPolicyRepository, cradle.calendarRepository)
    ).singleton(),

    listSlaPoliciesUseCase: asFunction(
      (cradle: SlaCradle) =>
        new ListSlaPoliciesUseCase(cradle.slaPolicyRepository)
    ).singleton(),

    getSlaPolicyUseCase: asFunction(
      (cradle: SlaCradle) =>
        new GetSlaPolicyUseCase(cradle.slaPolicyRepository)
    ).singleton(),

    slaController: asFunction(
      (cradle: SlaCradle) =>
        new SlaController(
          cradle.createCalendarUseCase,
          cradle.listCalendarsUseCase,
          cradle.getCalendarUseCase,
          cradle.createSlaPolicyUseCase,
          cradle.listSlaPoliciesUseCase,
          cradle.getSlaPolicyUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: SlaContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: SlaCradle) =>
        createRoutes(cradle.slaController, cradle.authMiddleware)
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
