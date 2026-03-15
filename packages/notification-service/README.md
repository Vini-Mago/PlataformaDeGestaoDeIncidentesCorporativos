# notification-service

Notifications: create, list and get by id. Types: email, in_app, push. Used for alerts and delivery tracking; future: SMTP, Slack, Teams, webhooks.

## Setup

1. Create PostgreSQL database: `CREATE DATABASE notification_service;` (or `createdb notification_service`).
2. Copy `.env.example` to `.env` and set at least: `NOTIFICATION_DATABASE_URL` (e.g. `postgresql://pgic:pgic@localhost:5432/notification_service`), `JWT_SECRET`, `NOTIFICATION_SERVICE_PORT`, `NODE_ENV`. JWT_SECRET must be strong (min 32 characters) and match identity-service so issued tokens validate here. Put `.env` in the package root (`packages/notification-service/`).
3. Run migrations from repo root: `pnpm --filter notification-service run prisma:migrate:deploy`.

## Scripts

- `pnpm dev` — start with ts-node-dev
- `pnpm test` — unit tests (vitest)
- `pnpm test:integration` — API integration tests (requires PostgreSQL)

## Gateway

- Prefix: `/notifications/` (e.g. `http://localhost:8080/notifications/health`)
