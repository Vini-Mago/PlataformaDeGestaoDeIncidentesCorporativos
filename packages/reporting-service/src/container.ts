import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaReportDefinitionRepository } from "./adapters/driven/persistence/prisma-report-definition.repository";
import { CreateReportDefinitionUseCase } from "./application/use-cases/create-report-definition.use-case";
import { ListReportDefinitionsUseCase } from "./application/use-cases/list-report-definitions.use-case";
import { GetReportDefinitionUseCase } from "./application/use-cases/get-report-definition.use-case";
import { ReportingController } from "./adapters/driving/http/reporting.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface ReportingContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
}

interface ReportingCradle {
  config: ReportingContainerConfig;
  prisma: PrismaClient;
  reportDefinitionRepository: PrismaReportDefinitionRepository;
  createReportDefinitionUseCase: CreateReportDefinitionUseCase;
  listReportDefinitionsUseCase: ListReportDefinitionsUseCase;
  getReportDefinitionUseCase: GetReportDefinitionUseCase;
  reportingController: ReportingController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: ReportingContainerConfig) {
  const awilix = createAwilixContainer<ReportingCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: ReportingContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    reportDefinitionRepository: asFunction(
      (cradle: ReportingCradle) => new PrismaReportDefinitionRepository(cradle.prisma)
    ).singleton(),

    createReportDefinitionUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new CreateReportDefinitionUseCase(cradle.reportDefinitionRepository)
    ).singleton(),

    listReportDefinitionsUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new ListReportDefinitionsUseCase(cradle.reportDefinitionRepository)
    ).singleton(),

    getReportDefinitionUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new GetReportDefinitionUseCase(cradle.reportDefinitionRepository)
    ).singleton(),

    reportingController: asFunction(
      (cradle: ReportingCradle) =>
        new ReportingController(
          cradle.createReportDefinitionUseCase,
          cradle.listReportDefinitionsUseCase,
          cradle.getReportDefinitionUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: ReportingContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: ReportingCradle) =>
        createRoutes(cradle.reportingController, cradle.authMiddleware)
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
