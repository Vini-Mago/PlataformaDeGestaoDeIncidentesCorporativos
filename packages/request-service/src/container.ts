import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier, logger } from "@pgic/shared";
import { PrismaServiceCatalogRepository } from "./adapters/driven/persistence/prisma-service-catalog.repository";
import { PrismaServiceRequestRepository } from "./adapters/driven/persistence/prisma-service-request.repository";
import { PrismaReplicatedUserStore } from "./adapters/driven/persistence/prisma-replicated-user.store";
import { CreateCatalogItemUseCase } from "./application/use-cases/create-catalog-item.use-case";
import { ListCatalogItemsUseCase } from "./application/use-cases/list-catalog-items.use-case";
import { GetCatalogItemUseCase } from "./application/use-cases/get-catalog-item.use-case";
import { CreateServiceRequestUseCase } from "./application/use-cases/create-service-request.use-case";
import { ListServiceRequestsUseCase } from "./application/use-cases/list-service-requests.use-case";
import { GetServiceRequestWithCommentsUseCase } from "./application/use-cases/get-service-request-with-comments.use-case";
import { SubmitServiceRequestUseCase } from "./application/use-cases/submit-service-request.use-case";
import { AddRequestCommentUseCase } from "./application/use-cases/add-request-comment.use-case";
import { HandleUserCreatedUseCase } from "./application/use-cases/handle-user-created.use-case";
import { CatalogItemController } from "./adapters/driving/http/catalog-item.controller";
import { ServiceRequestController } from "./adapters/driving/http/service-request.controller";
import { RabbitMqUserCreatedConsumer } from "./adapters/driving/messaging/rabbitmq-user-created.consumer";
import { RabbitMqUserUpdatedConsumer } from "./adapters/driving/messaging/rabbitmq-user-updated.consumer";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface RequestContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
  /** When set, user.created consumer is started for replicating users from identity-service. */
  rabbitmqUrl?: string;
}

interface RequestCradle {
  config: RequestContainerConfig;
  prisma: PrismaClient;
  catalogRepository: PrismaServiceCatalogRepository;
  requestRepository: PrismaServiceRequestRepository;
  replicatedUserStore: PrismaReplicatedUserStore;
  createCatalogItemUseCase: CreateCatalogItemUseCase;
  listCatalogItemsUseCase: ListCatalogItemsUseCase;
  getCatalogItemUseCase: GetCatalogItemUseCase;
  createServiceRequestUseCase: CreateServiceRequestUseCase;
  listServiceRequestsUseCase: ListServiceRequestsUseCase;
  getServiceRequestWithCommentsUseCase: GetServiceRequestWithCommentsUseCase;
  submitServiceRequestUseCase: SubmitServiceRequestUseCase;
  addRequestCommentUseCase: AddRequestCommentUseCase;
  handleUserCreatedUseCase: HandleUserCreatedUseCase;
  userCreatedConsumer: RabbitMqUserCreatedConsumer | null;
  userUpdatedConsumer: RabbitMqUserUpdatedConsumer | null;
  catalogItemController: CatalogItemController;
  serviceRequestController: ServiceRequestController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: RequestContainerConfig) {
  const awilix = createAwilixContainer<RequestCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: RequestContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    catalogRepository: asFunction(
      (cradle: RequestCradle) => new PrismaServiceCatalogRepository(cradle.prisma)
    ).singleton(),

    requestRepository: asFunction(
      (cradle: RequestCradle) => new PrismaServiceRequestRepository(cradle.prisma)
    ).singleton(),

    replicatedUserStore: asFunction(
      (cradle: RequestCradle) => new PrismaReplicatedUserStore(cradle.prisma)
    ).singleton(),

    createCatalogItemUseCase: asFunction(
      (cradle: RequestCradle) =>
        new CreateCatalogItemUseCase(cradle.catalogRepository)
    ).singleton(),

    listCatalogItemsUseCase: asFunction(
      (cradle: RequestCradle) =>
        new ListCatalogItemsUseCase(cradle.catalogRepository)
    ).singleton(),

    getCatalogItemUseCase: asFunction(
      (cradle: RequestCradle) =>
        new GetCatalogItemUseCase(cradle.catalogRepository)
    ).singleton(),

    createServiceRequestUseCase: asFunction(
      (cradle: RequestCradle) =>
        new CreateServiceRequestUseCase(
          cradle.requestRepository,
          cradle.catalogRepository
        )
    ).singleton(),

    listServiceRequestsUseCase: asFunction(
      (cradle: RequestCradle) =>
        new ListServiceRequestsUseCase(cradle.requestRepository)
    ).singleton(),

    getServiceRequestWithCommentsUseCase: asFunction(
      (cradle: RequestCradle) =>
        new GetServiceRequestWithCommentsUseCase(cradle.requestRepository)
    ).singleton(),

    submitServiceRequestUseCase: asFunction(
      (cradle: RequestCradle) =>
        new SubmitServiceRequestUseCase(cradle.requestRepository)
    ).singleton(),

    addRequestCommentUseCase: asFunction(
      (cradle: RequestCradle) =>
        new AddRequestCommentUseCase(cradle.requestRepository)
    ).singleton(),

    handleUserCreatedUseCase: asFunction(
      (cradle: RequestCradle) =>
        new HandleUserCreatedUseCase(cradle.replicatedUserStore)
    ).singleton(),

    userCreatedConsumer: asFunction((cradle: RequestCradle) => {
      const url = cradle.config.rabbitmqUrl;
      if (!url) return null;
      return new RabbitMqUserCreatedConsumer(url, cradle.handleUserCreatedUseCase);
    }).singleton(),

    userUpdatedConsumer: asFunction((cradle: RequestCradle) => {
      const url = cradle.config.rabbitmqUrl;
      if (!url) return null;
      return new RabbitMqUserUpdatedConsumer(url, cradle.handleUserCreatedUseCase);
    }).singleton(),

    catalogItemController: asFunction(
      (cradle: RequestCradle) =>
        new CatalogItemController(
          cradle.createCatalogItemUseCase,
          cradle.listCatalogItemsUseCase,
          cradle.getCatalogItemUseCase
        )
    ).singleton(),

    serviceRequestController: asFunction(
      (cradle: RequestCradle) =>
        new ServiceRequestController(
          cradle.createServiceRequestUseCase,
          cradle.listServiceRequestsUseCase,
          cradle.getServiceRequestWithCommentsUseCase,
          cradle.submitServiceRequestUseCase,
          cradle.addRequestCommentUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: RequestContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: RequestCradle) =>
        createRoutes(
          cradle.catalogItemController,
          cradle.serviceRequestController,
          cradle.authMiddleware
        )
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
    get userCreatedConsumer() {
      return c.userCreatedConsumer;
    },
    get userUpdatedConsumer() {
      return c.userUpdatedConsumer;
    },
    async disconnect(): Promise<void> {
      try {
        if (c.userCreatedConsumer) await c.userCreatedConsumer.stop();
        if (c.userUpdatedConsumer) await c.userUpdatedConsumer.stop();
      } catch (err) {
        logger.error({ err }, "userCreatedConsumer.stop() failed on disconnect");
      } finally {
        await c.prisma.$disconnect();
      }
    },
  };
}
