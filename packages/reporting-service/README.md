# reporting-service

KPIs, dashboards, report definitions and export (RF-4.x). CRUD for saved report configs; future: aggregation from other services, PDF/CSV export, background jobs.

## Setup

- PostgreSQL database `reporting_service`. Run from repo root: `pnpm --filter reporting-service run prisma:migrate:deploy`.
- JWT_SECRET: shared with identity-service for auth. Set the same value so tokens signed by identity-service validate here.

## Scripts

- `pnpm dev` — start with ts-node-dev
- `pnpm test` — unit tests (vitest)
- `pnpm test:integration` — API integration tests (requires PostgreSQL)

## Gateway

- Prefix: `/reporting/` (e.g. `http://localhost:8080/reporting/health`)
