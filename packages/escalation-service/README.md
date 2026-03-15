# escalation-service

Escalation orchestration: configurable rules (conditions + actions) and history of executed escalations. Consumes incident and SLA events (future); exposes HTTP API for CRUD of rules.

## Setup

- PostgreSQL database `escalation_service`. Run from repo root: `pnpm --filter escalation-service run prisma:migrate:deploy`.
- JWT_SECRET: use same as identity-service for auth.

## Scripts

- `pnpm dev` — start with ts-node-dev
- `pnpm test` — unit tests (vitest)
- `pnpm test:integration` — API integration tests (requires PostgreSQL)

## Gateway

- Prefix: `/escalation/` (e.g. `http://localhost:8080/escalation/health`)
