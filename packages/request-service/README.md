# Request Service

Microservice for **service catalog** (RF-6.1) and **service requests** (RF-6.2): standardized catalog items, creation of requests from the catalog, and workflow (Draft → Submitted → InApproval → Approved/Rejected → InProgress → Completed).

## Features

- **Catalog items:** CRUD of services users can request (name, description, category, team, SLA, form schema, approval flow).
- **Service requests:** Create from catalog item, list, get (with comments), submit (Draft → Submitted), add comment.
- **Auth:** JWT validation via `@pgic/shared`; create catalog item and create/submit/comment on requests require auth.

## API (prefix `/api`)

- `GET /catalog-items` — List active catalog items (public).
- `GET /catalog-items/:id` — Get catalog item by id (public).
- `POST /catalog-items` — Create catalog item (auth required).
- `POST /service-requests` — Create service request (auth required).
- `GET /service-requests` — List service requests (query: `requesterId`, `status`, `catalogItemId`).
- `GET /service-requests/:id` — Get service request with comments.
- **Workflow transitions (Draft → Submitted → InApproval → Approved/Rejected → InProgress → Completed):**
  - `POST /service-requests/:id/submit` — Draft → Submitted (SubmitRequest). *Implemented.*
  - *TODO:* `POST /service-requests/:id/send-for-approval` — Submitted → InApproval (SendForApprovalRequest).
  - *TODO:* `POST /service-requests/:id/approve` — InApproval → Approved (ApproveRequest).
  - *TODO:* `POST /service-requests/:id/reject` — InApproval → Rejected (RejectRequest). *Clarify when implemented:* Rejected is terminal unless a resubmit path exists; if requests can return to Draft after reject, add `POST /service-requests/:id/resubmit` (ResubmitRequest).
  - *TODO:* `POST /service-requests/:id/start` — Approved → InProgress (StartRequest).
  - *TODO:* `POST /service-requests/:id/complete` — InProgress → Completed (CompleteRequest).
  - Same HTTP style for all: POST with path param `:id` and optional body; document when implemented.
- `POST /service-requests/:id/comments` — Add comment (auth required).

## Environment

- `REQUEST_DATABASE_URL` — PostgreSQL connection string.
- `REQUEST_SERVICE_PORT` — HTTP port (default 3002).
- `JWT_SECRET` — Same as identity-service (≥ 32 chars).

## Run

```bash
pnpm install
pnpm exec prisma migrate dev --name init
pnpm run dev
```

Gateway: `http://localhost:8080/request/`.
