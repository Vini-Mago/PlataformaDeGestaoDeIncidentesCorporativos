# audit-service

Audit trail: who, when, what (entity + action). Stores user and technical actions for compliance and history. Exposes HTTP API for creating and querying audit entries.

## Setup

1. Create PostgreSQL database `audit_service` (e.g. `createdb audit_service` or `CREATE DATABASE audit_service;`).
2. Copy `.env.example` to `.env` and set at least: `AUDIT_DATABASE_URL` (e.g. `postgresql://pgic:pgic@localhost:5432/audit_service`), `JWT_SECRET`, `AUDIT_SERVICE_PORT`, `NODE_ENV`. Use a unique JWT secret for this service (see .env.example for generation).
3. For initial local dev run migrations with `pnpm --filter audit-service run prisma:migrate:dev` (creates migration history). For CI/production use `pnpm --filter audit-service run prisma:migrate:deploy` to apply existing migrations only.

## Scripts

- `pnpm dev` — start with ts-node-dev
- `pnpm test` — unit tests (vitest)
- `pnpm test:integration` — API integration tests (requires PostgreSQL)

## Gateway

- Prefix: `/audit/` (e.g. `http://localhost:8080/audit/health`)
