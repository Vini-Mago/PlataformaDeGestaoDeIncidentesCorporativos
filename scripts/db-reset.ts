import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

// Load root .env file variables
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index < 1) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    let val = trimmed.slice(index + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

// Database-backed services and their respective database URL env variables
const services = [
  { name: "identity-service", dbEnv: "IDENTITY_DATABASE_URL" },
  { name: "request-service", dbEnv: "REQUEST_DATABASE_URL" },
  { name: "incident-service", dbEnv: "INCIDENT_DATABASE_URL" },
  { name: "problem-change-service", dbEnv: "PROBLEM_CHANGE_DATABASE_URL" },
  { name: "sla-service", dbEnv: "SLA_DATABASE_URL" },
  { name: "escalation-service", dbEnv: "ESCALATION_DATABASE_URL" },
  { name: "notification-service", dbEnv: "NOTIFICATION_DATABASE_URL" },
  { name: "audit-service", dbEnv: "AUDIT_DATABASE_URL" },
  { name: "reporting-service", dbEnv: "REPORTING_DATABASE_URL" },
  { name: "integration-service", dbEnv: "INTEGRATION_DATABASE_URL" },
];

async function main() {
  console.log("Starting database reset and migration for all services...");

  for (const service of services) {
    const dbUrl = env[service.dbEnv] || process.env[service.dbEnv];
    if (!dbUrl) {
      console.warn(`Warning: Environment variable ${service.dbEnv} is not defined. Skipping ${service.name}.`);
      continue;
    }

    console.log(`\n----------------------------------------`);
    console.log(`Resetting database for: ${service.name}`);
    console.log(`----------------------------------------`);

    const serviceDir = path.join(rootDir, "packages", service.name);

    // Set up the environment variables for child processes
    const childEnv = {
      ...process.env,
      ...env,
      DATABASE_URL: dbUrl,
    };

    try {
      // 1. Ensure the database exists
      console.log(`[${service.name}] Ensuring database exists...`);
      execSync("npx tsx ../../scripts/ensure-database.ts", {
        cwd: serviceDir,
        env: childEnv,
        stdio: "inherit",
      });

      // 2. Reset the database schema and run migrations
      console.log(`[${service.name}] Running prisma migrate reset...`);
      execSync("npx prisma migrate reset --force", {
        cwd: serviceDir,
        env: childEnv,
        stdio: "inherit",
      });

      console.log(`[${service.name}] Database reset and migrated successfully.`);
    } catch (error) {
      console.error(`Error resetting database for service ${service.name}:`, error);
      process.exit(1);
    }
  }

  console.log("\nDatabase reset and migration completed successfully for all services!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
