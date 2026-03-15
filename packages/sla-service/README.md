# sla-service

SLA policies and calendars for the PGIC platform (RF-8.1, RF-8.2).

## Responsibility

- **Calendars:** Working days, business hours, timezone, holidays.
- **SLA policies:** Conditions (ticket type, criticality, service, client), response/resolution times, calendar, priority for conflict resolution.
- **Events:** Publishes `sla.risk` and `sla.breach` via Outbox Pattern for escalation and notification.

## Run

```bash
# From repo root
pnpm install
# Ensure Postgres and (optional) RabbitMQ are up
pnpm run dev:sla
```

- Health: `http://localhost:3006/health`
- API docs: `http://localhost:3006/api-docs`
- Via gateway: `http://localhost:8080/sla/`

## Database

- Database: `sla_service`
- Migrate: `pnpm --filter sla-service run prisma:migrate:deploy`

## Env

See `.env.example`. Required: `SLA_DATABASE_URL`, `SLA_SERVICE_PORT`. Optional: `JWT_SECRET`, `RABBITMQ_URL`, `OUTBOX_RELAY_INTERVAL_MS`.
