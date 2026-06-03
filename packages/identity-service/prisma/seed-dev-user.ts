import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaClient } from "../generated/prisma-client";
import { PrismaAuthorizationRepository } from "../src/adapters/driven/persistence/prisma-authorization.repository";

const rootDir = path.resolve(process.cwd(), "../..");

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = {
  ...readEnvFile(path.join(rootDir, ".env.example")),
  ...readEnvFile(path.join(rootDir, ".env")),
};

for (const [key, value] of Object.entries(fileEnv)) {
  process.env[key] ??= value;
}

const databaseUrl =
  process.env.IDENTITY_DATABASE_URL ??
  "postgresql://pgic:pgic@localhost:55432/identity_service";

type DevSeedUser = {
  email: string;
  login: string;
  password: string;
  name: string;
  phone: string;
  department: string;
  jobTitle: string;
  preferredLanguage: string;
  timeZone: string;
  role: string;
  status: "active" | "inactive";
  photoUrl?: string;
};

const defaultSeedPassword =
  process.env.DEV_SEED_DEFAULT_PASSWORD ??
  process.env.DEV_SEED_ADMIN_PASSWORD ??
  "Admin123!";

const devSeedUsers: DevSeedUser[] = [
  {
    email: process.env.DEV_SEED_ADMIN_EMAIL ?? "admin@pgic.local",
    login: process.env.DEV_SEED_ADMIN_LOGIN ?? "admin",
    password: process.env.DEV_SEED_ADMIN_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_ADMIN_NAME ?? "Administrador PGIC",
    phone: process.env.DEV_SEED_ADMIN_PHONE ?? "+55 11 90000-0000",
    department: process.env.DEV_SEED_ADMIN_DEPARTMENT ?? "Operacoes de TI",
    jobTitle: process.env.DEV_SEED_ADMIN_JOB_TITLE ?? "Administrador da Plataforma",
    preferredLanguage: process.env.DEV_SEED_ADMIN_LANGUAGE ?? "pt-BR",
    timeZone: process.env.DEV_SEED_ADMIN_TIME_ZONE ?? "America/Sao_Paulo",
    role: "admin",
    status: "active",
    photoUrl: "https://example.com/avatars/admin-pgic.png",
  },
  {
    email: process.env.DEV_SEED_MANAGER_EMAIL ?? "gestor@pgic.local",
    login: process.env.DEV_SEED_MANAGER_LOGIN ?? "gestor",
    password: process.env.DEV_SEED_MANAGER_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_MANAGER_NAME ?? "Marina Gestora",
    phone: process.env.DEV_SEED_MANAGER_PHONE ?? "+55 11 90000-0001",
    department: process.env.DEV_SEED_MANAGER_DEPARTMENT ?? "Gestao de Servicos",
    jobTitle: process.env.DEV_SEED_MANAGER_JOB_TITLE ?? "Gestora de Operacoes ITSM",
    preferredLanguage: "pt-BR",
    timeZone: "America/Sao_Paulo",
    role: "gestor",
    status: "active",
    photoUrl: "https://example.com/avatars/gestor-pgic.png",
  },
  {
    email: process.env.DEV_SEED_ANALYST_EMAIL ?? "analista@pgic.local",
    login: process.env.DEV_SEED_ANALYST_LOGIN ?? "analista",
    password: process.env.DEV_SEED_ANALYST_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_ANALYST_NAME ?? "Carlos Analista",
    phone: process.env.DEV_SEED_ANALYST_PHONE ?? "+55 11 90000-0002",
    department: process.env.DEV_SEED_ANALYST_DEPARTMENT ?? "Suporte Corporativo",
    jobTitle: process.env.DEV_SEED_ANALYST_JOB_TITLE ?? "Analista de Suporte N2",
    preferredLanguage: "pt-BR",
    timeZone: "America/Sao_Paulo",
    role: "analista",
    status: "active",
    photoUrl: "https://example.com/avatars/analista-pgic.png",
  },
  {
    email: process.env.DEV_SEED_NOC_EMAIL ?? "noc@pgic.local",
    login: process.env.DEV_SEED_NOC_LOGIN ?? "noc",
    password: process.env.DEV_SEED_NOC_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_NOC_NAME ?? "Beatriz NOC",
    phone: process.env.DEV_SEED_NOC_PHONE ?? "+55 11 90000-0003",
    department: process.env.DEV_SEED_NOC_DEPARTMENT ?? "Network Operations Center",
    jobTitle: process.env.DEV_SEED_NOC_JOB_TITLE ?? "Operadora NOC",
    preferredLanguage: "pt-BR",
    timeZone: "America/Sao_Paulo",
    role: "noc",
    status: "active",
    photoUrl: "https://example.com/avatars/noc-pgic.png",
  },
  {
    email: process.env.DEV_SEED_USER_EMAIL ?? "usuario@pgic.local",
    login: process.env.DEV_SEED_USER_LOGIN ?? "usuario",
    password: process.env.DEV_SEED_USER_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_USER_NAME ?? "Rafael Solicitante",
    phone: process.env.DEV_SEED_USER_PHONE ?? "+55 11 90000-0004",
    department: process.env.DEV_SEED_USER_DEPARTMENT ?? "Financeiro",
    jobTitle: process.env.DEV_SEED_USER_JOB_TITLE ?? "Usuario Solicitante",
    preferredLanguage: "pt-BR",
    timeZone: "America/Sao_Paulo",
    role: "user",
    status: "active",
    photoUrl: "https://example.com/avatars/usuario-pgic.png",
  },
  {
    email: process.env.DEV_SEED_INACTIVE_EMAIL ?? "inativo@pgic.local",
    login: process.env.DEV_SEED_INACTIVE_LOGIN ?? "inativo",
    password: process.env.DEV_SEED_INACTIVE_PASSWORD ?? defaultSeedPassword,
    name: process.env.DEV_SEED_INACTIVE_NAME ?? "Usuario Inativo",
    phone: process.env.DEV_SEED_INACTIVE_PHONE ?? "+55 11 90000-0005",
    department: process.env.DEV_SEED_INACTIVE_DEPARTMENT ?? "Recursos Humanos",
    jobTitle: process.env.DEV_SEED_INACTIVE_JOB_TITLE ?? "Conta de Exemplo Inativa",
    preferredLanguage: "pt-BR",
    timeZone: "America/Sao_Paulo",
    role: "user",
    status: "inactive",
    photoUrl: "https://example.com/avatars/inativo-pgic.png",
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await new PrismaAuthorizationRepository(prisma).ensureDefaults();

    for (const seedUser of devSeedUsers) {
      const now = new Date();
      const passwordHash = await argon2.hash(seedUser.password, { type: argon2.argon2id });

      const user = await prisma.userModel.upsert({
        where: { email: seedUser.email },
        create: {
          id: randomUUID(),
          email: seedUser.email,
          login: seedUser.login,
          name: seedUser.name,
          status: seedUser.status,
          phone: seedUser.phone,
          department: seedUser.department,
          jobTitle: seedUser.jobTitle,
          photoUrl: seedUser.photoUrl,
          preferredLanguage: seedUser.preferredLanguage,
          timeZone: seedUser.timeZone,
          role: seedUser.role,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          login: seedUser.login,
          name: seedUser.name,
          status: seedUser.status,
          phone: seedUser.phone,
          department: seedUser.department,
          jobTitle: seedUser.jobTitle,
          photoUrl: seedUser.photoUrl,
          preferredLanguage: seedUser.preferredLanguage,
          timeZone: seedUser.timeZone,
          role: seedUser.role,
          updatedAt: now,
        },
      });

      await prisma.authCredentialModel.upsert({
        where: { userId: user.id },
        create: { userId: user.id, passwordHash },
        update: { passwordHash },
      });

      console.log(`[seed] usuario dev pronto: ${seedUser.login} (${seedUser.email}) - ${seedUser.role}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed] falha ao criar usuario dev", error);
  process.exit(1);
});
