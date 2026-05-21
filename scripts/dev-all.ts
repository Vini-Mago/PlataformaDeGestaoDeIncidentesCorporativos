import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

type ServiceName =
  | "identity"
  | "request"
  | "incident"
  | "problemChange"
  | "sla"
  | "escalation"
  | "notification"
  | "audit"
  | "reporting"
  | "integration";

interface ServiceConfig {
  key: ServiceName;
  label: string;
  packageName: string;
  portEnv: string;
  defaultPort: number;
  databaseEnv: string;
  databaseName: string;
  bffBaseUrlEnv: string;
  specUrlEnv: string;
  ownBaseUrlEnv?: string;
}

interface ManagedProcess {
  label: string;
  child: ChildProcess;
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shouldRunMigrations = process.argv.includes("--migrate");
const skipDocker = process.argv.includes("--skip-docker");
const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");

/** Linhas de servico/pnpm que valem mostrar no modo padrao (sem --verbose). */
const IMPORTANT_LOG_LINE =
  /listening|ready in \d|Local:\s*http|started server|VITE v|error|Error:|ERR_|fatal|Failed|falha|ECONNREFUSED|Cannot connect/i;
const PNPM_NOISE_LINE = /^> |^\s*$/;

const services: ServiceConfig[] = [
  {
    key: "identity",
    label: "identity",
    packageName: "identity-service",
    portEnv: "IDENTITY_SERVICE_PORT",
    defaultPort: 3001,
    databaseEnv: "IDENTITY_DATABASE_URL",
    databaseName: "identity_service",
    bffBaseUrlEnv: "IDENTITY_BASE_URL",
    specUrlEnv: "IDENTITY_SPEC_URL",
    ownBaseUrlEnv: "BASE_URL",
  },
  {
    key: "request",
    label: "request",
    packageName: "request-service",
    portEnv: "REQUEST_SERVICE_PORT",
    defaultPort: 3002,
    databaseEnv: "REQUEST_DATABASE_URL",
    databaseName: "request_service",
    bffBaseUrlEnv: "REQUEST_SERVICE_BASE_URL",
    specUrlEnv: "REQUEST_SPEC_URL",
    ownBaseUrlEnv: "BASE_URL",
  },
  {
    key: "incident",
    label: "incident",
    packageName: "incident-service",
    portEnv: "INCIDENT_SERVICE_PORT",
    defaultPort: 3004,
    databaseEnv: "INCIDENT_DATABASE_URL",
    databaseName: "incident_service",
    bffBaseUrlEnv: "INCIDENT_SERVICE_BASE_URL",
    specUrlEnv: "INCIDENT_SPEC_URL",
    ownBaseUrlEnv: "BASE_URL",
  },
  {
    key: "problemChange",
    label: "problem-change",
    packageName: "problem-change-service",
    portEnv: "PROBLEM_CHANGE_SERVICE_PORT",
    defaultPort: 3005,
    databaseEnv: "PROBLEM_CHANGE_DATABASE_URL",
    databaseName: "problem_change_service",
    bffBaseUrlEnv: "PROBLEM_CHANGE_SERVICE_BASE_URL",
    specUrlEnv: "PROBLEM_CHANGE_SPEC_URL",
    ownBaseUrlEnv: "PROBLEM_CHANGE_SERVICE_URL",
  },
  {
    key: "sla",
    label: "sla",
    packageName: "sla-service",
    portEnv: "SLA_SERVICE_PORT",
    defaultPort: 3006,
    databaseEnv: "SLA_DATABASE_URL",
    databaseName: "sla_service",
    bffBaseUrlEnv: "SLA_SERVICE_BASE_URL",
    specUrlEnv: "SLA_SPEC_URL",
    ownBaseUrlEnv: "SLA_SERVICE_URL",
  },
  {
    key: "escalation",
    label: "escalation",
    packageName: "escalation-service",
    portEnv: "ESCALATION_SERVICE_PORT",
    defaultPort: 3007,
    databaseEnv: "ESCALATION_DATABASE_URL",
    databaseName: "escalation_service",
    bffBaseUrlEnv: "ESCALATION_SERVICE_BASE_URL",
    specUrlEnv: "ESCALATION_SPEC_URL",
    ownBaseUrlEnv: "ESCALATION_SERVICE_URL",
  },
  {
    key: "notification",
    label: "notification",
    packageName: "notification-service",
    portEnv: "NOTIFICATION_SERVICE_PORT",
    defaultPort: 3008,
    databaseEnv: "NOTIFICATION_DATABASE_URL",
    databaseName: "notification_service",
    bffBaseUrlEnv: "NOTIFICATION_SERVICE_BASE_URL",
    specUrlEnv: "NOTIFICATION_SPEC_URL",
    ownBaseUrlEnv: "NOTIFICATION_SERVICE_URL",
  },
  {
    key: "audit",
    label: "audit",
    packageName: "audit-service",
    portEnv: "AUDIT_SERVICE_PORT",
    defaultPort: 3009,
    databaseEnv: "AUDIT_DATABASE_URL",
    databaseName: "audit_service",
    bffBaseUrlEnv: "AUDIT_SERVICE_BASE_URL",
    specUrlEnv: "AUDIT_SPEC_URL",
    ownBaseUrlEnv: "AUDIT_SERVICE_URL",
  },
  {
    key: "reporting",
    label: "reporting",
    packageName: "reporting-service",
    portEnv: "REPORTING_SERVICE_PORT",
    defaultPort: 3010,
    databaseEnv: "REPORTING_DATABASE_URL",
    databaseName: "reporting_service",
    bffBaseUrlEnv: "REPORTING_SERVICE_BASE_URL",
    specUrlEnv: "REPORTING_SPEC_URL",
    ownBaseUrlEnv: "REPORTING_SERVICE_URL",
  },
  {
    key: "integration",
    label: "integration",
    packageName: "integration-service",
    portEnv: "INTEGRATION_SERVICE_PORT",
    defaultPort: 3011,
    databaseEnv: "INTEGRATION_DATABASE_URL",
    databaseName: "integration_service",
    bffBaseUrlEnv: "INTEGRATION_SERVICE_BASE_URL",
    specUrlEnv: "INTEGRATION_SPEC_URL",
    ownBaseUrlEnv: "INTEGRATION_SERVICE_URL",
  },
];

const managedProcesses: ManagedProcess[] = [];
let shuttingDown = false;

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env: Record<string, string> = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number.parseInt(value ?? "", 10);
  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port;
  }
  return fallback;
}

function canBindPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host: "0.0.0.0", exclusive: true });
  });
}

async function choosePort(
  env: Record<string, string>,
  envName: string,
  fallback: number,
  reserved: Set<number>,
  protectedPorts = new Set<number>()
): Promise<number> {
  const requestedPort = parsePort(env[envName], fallback);
  let port = requestedPort;
  while (reserved.has(port) || (port !== requestedPort && protectedPorts.has(port)) || !(await canBindPort(port))) {
    const next = port + 1;
    if (verbose) {
      console.log(`[ports] ${envName}=${port} indisponivel; tentando ${next}`);
    }
    port = next;
    if (port > 65535) {
      throw new Error(`Nao ha porta livre para ${envName}`);
    }
  }
  if (!verbose && port !== requestedPort) {
    console.log(`[ports] ${envName}: ${requestedPort} → ${port}`);
  }
  reserved.add(port);
  env[envName] = String(port);
  return port;
}

function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(hostname);
}

function updateLocalUrlPort(value: string | undefined, port: number): string | undefined {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);
    if (isLocalHost(url.hostname)) {
      url.hostname = "localhost";
      url.port = String(port);
    }
    return url.toString();
  } catch {
    return value;
  }
}

function postgresUrl(env: Record<string, string>, databaseName: string, port: number): string {
  const user = encodeURIComponent(env.POSTGRES_USER ?? "pgic");
  const password = encodeURIComponent(env.POSTGRES_PASSWORD ?? "pgic");
  return `postgresql://${user}:${password}@localhost:${port}/${databaseName}`;
}

function setUrlEnv(env: Record<string, string>, key: string, value: string): void {
  env[key] = value;
}

function attachLineCollector(stream: NodeJS.ReadableStream | null): string[] {
  const lines: string[] = [];
  if (!stream) {
    return lines;
  }
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => lines.push(line));
  return lines;
}

function runCommand(
  label: string,
  command: string,
  args: string[],
  env: Record<string, string>,
  options: { quiet?: boolean } = {}
): Promise<void> {
  const quiet = options.quiet ?? !verbose;

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd: rootDir,
      env,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    };
    const child = spawn(command, args, spawnOptions);
    const stdoutLines = quiet ? attachLineCollector(child.stdout) : [];
    const stderrLines = quiet ? attachLineCollector(child.stderr) : [];

    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        if (quiet) {
          console.log(`[${label}] ok`);
        }
        resolve();
        return;
      }
      if (quiet) {
        console.error(`[${label}] falhou (${signal ?? `codigo ${code}`})`);
        for (const line of [...stdoutLines, ...stderrLines].slice(-40)) {
          console.error(line);
        }
      }
      reject(new Error(`${label} finalizou com ${signal ?? `codigo ${code}`}`));
    });
  });
}

function shouldPrintServiceLine(line: string): boolean {
  if (verbose) {
    return true;
  }
  if (PNPM_NOISE_LINE.test(line)) {
    return false;
  }
  return IMPORTANT_LOG_LINE.test(line);
}

function pipeWithPrefix(child: ChildProcess, label: string): void {
  const emit = (line: string, isStderr: boolean) => {
    if (!shouldPrintServiceLine(line)) {
      return;
    }
    const writer = isStderr ? console.error : console.log;
    writer(`[${label}] ${line}`);
  };

  if (child.stdout) {
    const lines = readline.createInterface({ input: child.stdout });
    lines.on("line", (line) => emit(line, false));
  }

  if (child.stderr) {
    const lines = readline.createInterface({ input: child.stderr });
    lines.on("line", (line) => emit(line, true));
  }
}

function startManagedProcess(label: string, command: string, args: string[], env: Record<string, string>): void {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  managedProcesses.push({ label, child });
  pipeWithPrefix(child, label);

  child.once("error", (error) => {
    console.error(`[${label}] falha ao iniciar: ${error.message}`);
    void shutdown(1);
  });

  child.once("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[${label}] parou com ${signal ?? `codigo ${code}`}`);
    void shutdown(typeof code === "number" && code !== 0 ? code : 1);
  });
}

function buildChildEnv(baseEnv: Record<string, string>, extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...baseEnv,
    ...extra,
  };
}

async function waitForPostgres(env: Record<string, string>, port: number, timeoutMs: number): Promise<void> {
  const url = postgresUrl(env, "postgres", port);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch {
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`timeout aguardando Postgres em localhost:${port}`);
}

async function runMigrations(env: Record<string, string>): Promise<void> {
  console.log("[db] aplicando migrations");
  for (const service of services) {
    await runCommand(
      `db:${service.packageName}`,
      "pnpm",
      ["--filter", service.packageName, "run", "prisma:migrate:deploy"],
      env,
      { quiet: !verbose }
    );
  }
  if (!verbose) {
    console.log("[db] migrations concluidas");
  }
}

function waitForTcp(host: string, port: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`timeout aguardando ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function printSummary(env: Record<string, string>, title = "PGIC dev iniciado"): void {
  console.log("");
  console.log(title);
  console.log(`- Gateway:  http://localhost:${env.GATEWAY_PORT}`);
  console.log(`- BFF/UI:   http://localhost:${env.BFF_PORT}`);
  console.log(`- Frontend: http://localhost:${env.FRONTEND_PORT}`);
  console.log(`- API Docs: http://localhost:${env.API_DOCS_PORT}`);
  console.log("");
  console.log("Portas dos servicos:");
  for (const service of services) {
    console.log(`- ${service.packageName}: ${env[service.portEnv]}`);
  }
  console.log("");
  if (!verbose) {
    console.log("Logs resumidos. Use --verbose para saida completa.");
    console.log("");
  }
}

async function shutdown(exitCode = 0): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const { child } of managedProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const { child } of managedProcesses) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 2500).unref();
}

async function main(): Promise<void> {
  const envFromExample = readEnvFile(path.join(rootDir, ".env.example"));
  const envFromFile = readEnvFile(path.join(rootDir, ".env"));
  const env: Record<string, string> = {
    ...envFromExample,
    ...envFromFile,
    ...(process.env as Record<string, string>),
  };

  const reservedPorts = new Set<number>();
  const protectedAppPorts = new Set<number>([
    ...services.map((service) => parsePort(env[service.portEnv], service.defaultPort)),
    parsePort(env.API_DOCS_PORT, 3003),
    parsePort(env.BFF_PORT, 3100),
    parsePort(env.FRONTEND_PORT, 5173),
  ]);
  const postgresPort = await choosePort(env, "POSTGRES_PORT", 5432, reservedPorts);
  const redisPort = await choosePort(env, "REDIS_PORT", 6379, reservedPorts);
  const rabbitmqPort = await choosePort(env, "RABBITMQ_PORT", 5672, reservedPorts);
  await choosePort(env, "RABBITMQ_MANAGEMENT_PORT", 15672, reservedPorts);
  await choosePort(env, "GATEWAY_PORT", 8080, reservedPorts);

  for (const service of services) {
    await choosePort(env, service.portEnv, service.defaultPort, reservedPorts, protectedAppPorts);
  }

  await choosePort(env, "API_DOCS_PORT", 3003, reservedPorts, protectedAppPorts);
  await choosePort(env, "BFF_PORT", 3100, reservedPorts, protectedAppPorts);
  await choosePort(env, "FRONTEND_PORT", 5173, reservedPorts, protectedAppPorts);

  setUrlEnv(env, "REDIS_URL", updateLocalUrlPort(env.REDIS_URL ?? "redis://localhost:6379", redisPort) ?? "");
  setUrlEnv(env, "RABBITMQ_URL", updateLocalUrlPort(env.RABBITMQ_URL ?? "amqp://pgic:pgic@localhost:5672", rabbitmqPort) ?? "");
  setUrlEnv(env, "FRONTEND_DEV_URL", `http://localhost:${env.FRONTEND_PORT}`);
  setUrlEnv(env, "BFF_TARGET", `http://localhost:${env.BFF_PORT}`);
  setUrlEnv(env, "GATEWAY_BASE_URL", `http://localhost:${env.GATEWAY_PORT}`);

  for (const service of services) {
    const serviceUrl = `http://localhost:${env[service.portEnv]}`;
    setUrlEnv(env, service.bffBaseUrlEnv, serviceUrl);
    setUrlEnv(env, service.specUrlEnv, `${serviceUrl}/api-docs.json`);
    setUrlEnv(env, service.databaseEnv, updateLocalUrlPort(env[service.databaseEnv], postgresPort) ?? postgresUrl(env, service.databaseName, postgresPort));
  }
  setUrlEnv(env, "DATABASE_URL", updateLocalUrlPort(env.DATABASE_URL, postgresPort) ?? postgresUrl(env, "request_service", postgresPort));

  if (dryRun) {
    printSummary(env, "PGIC dev dry-run");
    console.log("Dry-run: nenhum container ou processo foi iniciado.");
    return;
  }

  if (!skipDocker) {
    console.log("[docker] subindo Postgres, Redis, RabbitMQ e Nginx");
    const dockerEnv = {
      ...env,
      COMPOSE_PROGRESS: verbose ? env.COMPOSE_PROGRESS : "quiet",
    };
    await runCommand("docker", "docker", ["compose", "up", "-d"], dockerEnv, { quiet: !verbose });
    await Promise.all([
      waitForPostgres(env, postgresPort, 60_000),
      waitForTcp("127.0.0.1", redisPort, 60_000),
      waitForTcp("127.0.0.1", rabbitmqPort, 60_000),
    ]);
  }

  if (shouldRunMigrations) {
    await runMigrations(env);
  }

  for (const service of services) {
    const serviceUrl = `http://localhost:${env[service.portEnv]}`;
    startManagedProcess(
      service.label,
      "pnpm",
      ["--filter", service.packageName, "run", "dev"],
      buildChildEnv(env, service.ownBaseUrlEnv ? { [service.ownBaseUrlEnv]: serviceUrl } : {})
    );
  }

  startManagedProcess("api-docs", "pnpm", ["--filter", "api-docs", "run", "dev"], env);
  startManagedProcess("frontend", "pnpm", [
    "--filter",
    "frontend",
    "run",
    "dev",
    "--",
    "--host",
    "0.0.0.0",
    "--port",
    env.FRONTEND_PORT,
    "--strictPort",
  ], env);
  startManagedProcess("bff", "pnpm", ["--filter", "bff", "run", "dev"], env);

  printSummary(env);
}

process.on("SIGINT", () => {
  void shutdown(0);
});
process.on("SIGTERM", () => {
  void shutdown(0);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void shutdown(1);
});
