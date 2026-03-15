# incident-service

Incident lifecycle management for PGIC: CRUD, workflow states (Open → In Analysis → In Progress → Pending Customer → Resolved → Closed), assignment, and comments.

## Features

- **RF-5.x:** Incident lifecycle, criticality, service affected, workflow
- **Outbox Pattern:** Publishes `incident.created`, `incident.status_changed`, `incident.assigned` via RabbitMQ (reliable)
- **User replication:** Consumes `user.created` from identity-service for display names
- **Hexagonal architecture:** Domain, application (use cases, ports), adapters (HTTP, Prisma, RabbitMQ)

## Setup

1. Copy `.env.example` to `.env` and set `INCIDENT_DATABASE_URL`, `JWT_SECRET`, `RABBITMQ_URL` (optional).
2. Run migrations: `pnpm prisma:migrate:deploy`
3. Start: `pnpm dev`

## API

- `POST /api/incidents` — Create incident (auth)
- `GET /api/incidents` — List (filters: requesterId, status, assignedToId, assignedTeamId)
- `GET /api/incidents/:id` — Get with comments
- `PATCH /api/incidents/:id/status` — Change status
- `PATCH /api/incidents/:id/assign` — Assign to team/user
- `POST /api/incidents/:id/comments` — Add comment
