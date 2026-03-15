import { createContainer as createAwilixContainer, asValue, asFunction } from "awilix";
import { PrismaClient } from "../generated/prisma-client/index";
import { createAuthMiddleware, JwtTokenVerifier } from "@pgic/shared";
import { PrismaAuditEntryRepository } from "./adapters/driven/persistence/prisma-audit-entry.repository";
import { CreateAuditEntryUseCase } from "./application/use-cases/create-audit-entry.use-case";
import { ListAuditEntriesUseCase } from "./application/use-cases/list-audit-entries.use-case";
import { GetAuditEntryUseCase } from "./application/use-cases/get-audit-entry.use-case";
import { AuditController } from "./adapters/driving/http/audit.controller";
import { createRoutes } from "./adapters/driving/http/routes";
import { mapApplicationErrorToHttp } from "./adapters/driving/http/error-to-http.mapper";

export interface AuditContainerConfig {
  databaseUrl: string;
  jwtSecret: string;
}

interface AuditCradle {
  config: AuditContainerConfig;
  prisma: PrismaClient;
  auditEntryRepository: PrismaAuditEntryRepository;
  createAuditEntryUseCase: CreateAuditEntryUseCase;
  listAuditEntriesUseCase: ListAuditEntriesUseCase;
  getAuditEntryUseCase: GetAuditEntryUseCase;
  auditController: AuditController;
  tokenVerifier: JwtTokenVerifier;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  routes: ReturnType<typeof createRoutes>;
}

export function createContainer(config: AuditContainerConfig) {
  const awilix = createAwilixContainer<AuditCradle>();

  awilix.register({
    config: asValue(config),

    prisma: asFunction(({ config }: { config: AuditContainerConfig }) => {
      return new PrismaClient({
        datasources: { db: { url: config.databaseUrl } },
      });
    }).singleton(),

    auditEntryRepository: asFunction(
      (cradle: AuditCradle) => new PrismaAuditEntryRepository(cradle.prisma)
    ).singleton(),

    createAuditEntryUseCase: asFunction(
      (cradle: AuditCradle) =>
        new CreateAuditEntryUseCase(cradle.auditEntryRepository)
    ).singleton(),

    listAuditEntriesUseCase: asFunction(
      (cradle: AuditCradle) =>
        new ListAuditEntriesUseCase(cradle.auditEntryRepository)
    ).singleton(),

    getAuditEntryUseCase: asFunction(
      (cradle: AuditCradle) =>
        new GetAuditEntryUseCase(cradle.auditEntryRepository)
    ).singleton(),

    auditController: asFunction(
      (cradle: AuditCradle) =>
        new AuditController(
          cradle.createAuditEntryUseCase,
          cradle.listAuditEntriesUseCase,
          cradle.getAuditEntryUseCase
        )
    ).singleton(),

    tokenVerifier: asFunction(({ config }: { config: AuditContainerConfig }) => {
      return new JwtTokenVerifier(config.jwtSecret);
    }).singleton(),

    authMiddleware: asFunction(
      ({ tokenVerifier }: { tokenVerifier: JwtTokenVerifier }) =>
        createAuthMiddleware((token) => tokenVerifier.verify(token))
    ).singleton(),

    routes: asFunction(
      (cradle: AuditCradle) =>
        createRoutes(cradle.auditController, cradle.authMiddleware)
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
