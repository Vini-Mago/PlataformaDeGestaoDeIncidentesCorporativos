# Request Service

Microservice for **service catalog** (RF-6.1) and **service requests** (RF-6.2): standardized catalog items, creation of requests from the catalog, and workflow (Draft → Submitted → InApproval → Approved/Rejected → InProgress → Completed).

## Features

- **Catalog items:** CRUD of services users can request (name, description, category, team, SLA, form schema, approval flow).
- **Service requests:** Create from catalog item, list, get (with comments and **workflow event trail**), submit, approval path, fulfilment, comments.
- **Auth:** JWT validation via `@pgic/shared`; catalog create and request mutations use RBAC (`requests:*` permissions).

## API (prefix `/api`)

- `GET /catalog-items` — List active catalog items (public).
- `GET /catalog-items/:id` — Get catalog item by id (public).
- `POST /catalog-items` — Create catalog item (auth required).
- `POST /service-requests` — Create service request (auth required).
- `GET /service-requests` — List service requests (query: `requesterId`, `status`, `catalogItemId`).
- `GET /service-requests/:id` — Get service request with `comments` and `workflowEvents` (actor, from→to status, optional `reason`, timestamps).

### Workflow transitions

Cada transição bem-sucedida grava uma linha em `service_request_workflow_events` (auditoria).

| Método | Transição | Quem pode (JWT) |
|--------|-----------|------------------|
| `POST /service-requests/:id/submit` | Draft → Submitted | `requests:update:own` (participante) ou `update:all` |
| `POST /service-requests/:id/send-for-approval` | Submitted → **InApproval** se `approvalFlow` ≠ `none`; senão → **Approved** | Idem submit |
| `POST /service-requests/:id/approve` | InApproval → Approved | `requests:approve:all` + papel JWT ∈ `approverRoleIds` do catálogo (se lista não vazia); `role === admin` ignora a lista |
| `POST /service-requests/:id/reject` | InApproval → Rejected | Corpo opcional `{ "reason": "..." }`. Mesmas regras que approve |
| `POST /service-requests/:id/start` | Approved → InProgress | `requests:update:all` |
| `POST /service-requests/:id/complete` | InProgress → Completed | `requests:update:all` |

- **Fluxos `single` / `sequential` / `parallel`:** nesta versão tratam-se como um único estado **InApproval** até approve/reject (evolução futura: múltiplos níveis).
- **Rejeição:** terminal; reabrir para novo ciclo seria um endpoint `resubmit` futuro, se necessário.

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
