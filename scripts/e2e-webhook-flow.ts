#!/usr/bin/env npx tsx
/**
 * E2E manual com serviços no ar: webhook HTTP → RabbitMQ → incident-service.
 *
 * Pré-requisitos:
 *   pnpm docker:up && pnpm db:migrate:deploy
 *   pnpm dev:integration & pnpm dev:incident
 *
 * Uso:
 *   npx tsx scripts/e2e-webhook-flow.ts
 */
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });

const INTEGRATION_URL = process.env.INTEGRATION_SERVICE_BASE_URL ?? "http://localhost:3011";
const API_KEY = process.env.INTEGRATION_WEBHOOK_API_KEY ?? "dev-integration-webhook-key";
const INCIDENT_URL = process.env.INCIDENT_SERVICE_BASE_URL ?? "http://localhost:3004";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const externalId = `manual-e2e-${Date.now()}`;

  console.log("1. POST webhook...");
  const webhookRes = await fetch(`${INTEGRATION_URL}/api/webhooks/v1/monitoring`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      externalId,
      title: "E2E manual — serviço indisponível",
      severity: "critical",
      serviceAffected: "payments-api",
    }),
  });
  const webhookBody = await webhookRes.json();
  console.log("   Status:", webhookRes.status, webhookBody);
  if (webhookRes.status !== 202) {
    process.exit(1);
  }

  console.log("2. Aguardar pipeline assíncrono (outbox + consumer)...");
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const health = await fetch(`${INCIDENT_URL}/health`);
    if (!health.ok) {
      console.log("   incident-service health:", health.status);
      continue;
    }
    console.log("   tentativa", i + 1, "— verifique incidentes com externalId:", externalId);
    console.log("   GET", `${INCIDENT_URL}/api/incidents (requer JWT no ambiente real)`);
  }

  console.log("\nConcluído. Confirme no banco incident_service ou na UI que o incidente foi criado.");
  console.log("externalId:", externalId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
