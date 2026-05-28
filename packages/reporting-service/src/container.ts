import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaReportDefinitionRepository } from "./adapters/driven/persistence/prisma-report-definition.repository";
import { PrismaReportExportJobRepository } from "./adapters/driven/persistence/prisma-report-export-job.repository";
import { CreateReportDefinitionUseCase } from "./application/use-cases/create-report-definition.use-case";
import { ListReportDefinitionsUseCase } from "./application/use-cases/list-report-definitions.use-case";
import { GetReportDefinitionUseCase } from "./application/use-cases/get-report-definition.use-case";
import { RequestReportExportUseCase } from "./application/use-cases/request-report-export.use-case";
import { GetReportExportJobUseCase } from "./application/use-cases/get-report-export-job.use-case";
import { DownloadReportExportJobUseCase } from "./application/use-cases/download-report-export-job.use-case";
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
  reportExportJobRepository: PrismaReportExportJobRepository;
  createReportDefinitionUseCase: CreateReportDefinitionUseCase;
  listReportDefinitionsUseCase: ListReportDefinitionsUseCase;
  getReportDefinitionUseCase: GetReportDefinitionUseCase;
  requestReportExportUseCase: RequestReportExportUseCase;
  getReportExportJobUseCase: GetReportExportJobUseCase;
  downloadReportExportJobUseCase: DownloadReportExportJobUseCase;
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
    reportExportJobRepository: asFunction(
      (cradle: ReportingCradle) => new PrismaReportExportJobRepository(cradle.prisma)
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
    requestReportExportUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new RequestReportExportUseCase(
          cradle.reportExportJobRepository,
          cradle.reportDefinitionRepository
        )
    ).singleton(),
    getReportExportJobUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new GetReportExportJobUseCase(cradle.reportExportJobRepository)
    ).singleton(),
    downloadReportExportJobUseCase: asFunction(
      (cradle: ReportingCradle) =>
        new DownloadReportExportJobUseCase(cradle.reportExportJobRepository)
    ).singleton(),

    reportingController: asFunction(
      (cradle: ReportingCradle) =>
        new ReportingController(
          cradle.createReportDefinitionUseCase,
          cradle.listReportDefinitionsUseCase,
          cradle.getReportDefinitionUseCase,
          cradle.requestReportExportUseCase,
          cradle.getReportExportJobUseCase,
          cradle.downloadReportExportJobUseCase
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
