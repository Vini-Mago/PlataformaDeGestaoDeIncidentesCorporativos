import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier, logger } from "@pgic/shared";
import { PrismaNotificationRepository } from "./adapters/driven/persistence/prisma-notification.repository";
import {
  NoopEmailSenderAdapter,
  SmtpEmailSenderAdapter,
  type SmtpEmailSenderConfig,
} from "./adapters/driven/email/smtp-email-sender.adapter";
import { CreateNotificationUseCase } from "./application/use-cases/create-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { GetNotificationUseCase } from "./application/use-cases/get-notification.use-case";
import { HandleRequestDomainEventUseCase } from "./application/use-cases/handle-request-domain-event.use-case";
import { RabbitMqRequestEventsConsumer } from "./adapters/driving/messaging/rabbitmq-request-events.consumer";
import { NotificationController } from "./adapters/driving/http/notification.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";
import type { IEmailSender } from "./application/ports/email-sender.port";

export interface NotificationContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  email?: SmtpEmailSenderConfig;
  /** Quando definido, inicia consumidor `request.events` → notificações in-app ao solicitante. */
  rabbitmqUrl?: string;
}

interface NotificationCradle {
  config: NotificationContainerConfig;
  prisma: PrismaClient;
  notificationRepository: PrismaNotificationRepository;
  emailSender: IEmailSender;
  createNotificationUseCase: CreateNotificationUseCase;
  handleRequestDomainEventUseCase: HandleRequestDomainEventUseCase;
  requestDomainEventsConsumer: RabbitMqRequestEventsConsumer | null;
  listNotificationsUseCase: ListNotificationsUseCase;
  getNotificationUseCase: GetNotificationUseCase;
  notificationController: NotificationController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: NotificationContainerConfig) {
  const awilix = createAwilixContainer<NotificationCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: NotificationContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    notificationRepository: asFunction(
      (cradle: NotificationCradle) => new PrismaNotificationRepository(cradle.prisma)
    ).singleton(),
    emailSender: asFunction((cradle: NotificationCradle) => {
      if (!cradle.config.email) {
        return new NoopEmailSenderAdapter();
      }
      return new SmtpEmailSenderAdapter(cradle.config.email);
    }).singleton(),

    createNotificationUseCase: asFunction(
      (cradle: NotificationCradle) =>
        new CreateNotificationUseCase(cradle.notificationRepository, cradle.emailSender)
    ).singleton(),

    handleRequestDomainEventUseCase: asFunction(
      (cradle: NotificationCradle) =>
        new HandleRequestDomainEventUseCase(cradle.createNotificationUseCase)
    ).singleton(),

    requestDomainEventsConsumer: asFunction((cradle: NotificationCradle) => {
      const url = cradle.config.rabbitmqUrl;
      if (!url) return null;
      return new RabbitMqRequestEventsConsumer(url, cradle.handleRequestDomainEventUseCase);
    }).singleton(),

    listNotificationsUseCase: asFunction(
      (cradle: NotificationCradle) =>
        new ListNotificationsUseCase(cradle.notificationRepository)
    ).singleton(),

    getNotificationUseCase: asFunction(
      (cradle: NotificationCradle) =>
        new GetNotificationUseCase(cradle.notificationRepository)
    ).singleton(),

    notificationController: asFunction(
      (cradle: NotificationCradle) =>
        new NotificationController(
          cradle.createNotificationUseCase,
          cradle.listNotificationsUseCase,
          cradle.getNotificationUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: NotificationContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: NotificationCradle) =>
        createRoutes(cradle.notificationController, cradle.authMiddleware)
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
    get requestDomainEventsConsumer() {
      return c.requestDomainEventsConsumer;
    },
    async disconnect(): Promise<void> {
      try {
        if (c.requestDomainEventsConsumer) await c.requestDomainEventsConsumer.stop();
      } catch (err) {
        logger.error({ err }, "requestDomainEventsConsumer.stop() failed on disconnect");
      }
      try {
        await c.prisma.$disconnect();
      } catch (err) {
        logger.error({ err }, "Error disconnecting Prisma client");
      }
    },
  };
}
