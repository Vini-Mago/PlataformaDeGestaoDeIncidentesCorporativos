# notification-service

Notifications: create, list and get by id. Types: email, in_app, push. Used for alerts and delivery tracking; future: SMTP, Slack, Teams, webhooks.

## Setup

- PostgreSQL database `notification_service`. Run from repo root: `pnpm --filter notification-service run prisma:migrate:deploy`.
- JWT_SECRET: use same as identity-service for auth.

## Scripts

- `pnpm dev` — start with ts-node-dev
- `pnpm test` — unit tests (vitest)
- `pnpm test:integration` — API integration tests (requires PostgreSQL)

## Gateway

- Prefix: `/notifications/` (e.g. `http://localhost:8080/notifications/health`)
