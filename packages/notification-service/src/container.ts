import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaNotificationRepository } from "./adapters/driven/persistence/prisma-notification.repository";
import { CreateNotificationUseCase } from "./application/use-cases/create-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { GetNotificationUseCase } from "./application/use-cases/get-notification.use-case";
import { NotificationController } from "./adapters/driving/http/notification.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface NotificationContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
}

interface NotificationCradle {
  config: NotificationContainerConfig;
  prisma: PrismaClient;
  notificationRepository: PrismaNotificationRepository;
  createNotificationUseCase: CreateNotificationUseCase;
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

    createNotificationUseCase: asFunction(
      (cradle: NotificationCradle) =>
        new CreateNotificationUseCase(cradle.notificationRepository)
    ).singleton(),

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
    async disconnect(): Promise<void> {
      try {
        await c.prisma.$disconnect();
      } catch (err) {
        console.error("Error disconnecting Prisma client", err);
      }
    },
  };
}
