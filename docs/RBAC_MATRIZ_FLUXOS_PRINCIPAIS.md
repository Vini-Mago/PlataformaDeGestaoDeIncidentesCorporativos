# PGIC — Matriz RBAC dos Fluxos Principais (F1-05)

Data de referência: 2026-05-26

## Convenções

- `401`: sem token JWT válido.
- `403`: token válido sem permissão necessária.
- `admin`: bypass permitido pelo middleware (`role=admin`).
- Escopo `read:own`: acesso limitado ao próprio recurso (ou recursos relacionados ao usuário).

## incident-service

| Endpoint | Permissão JWT | Regra adicional de escopo |
|---|---|---|
| `POST /api/incidents` | `incidents:create:all` | sem regra extra |
| `GET /api/incidents` | `incidents:read:all` ou `incidents:read:own` | com `read:own`, lista restringe ao solicitante/atribuído |
| `GET /api/incidents/:id` | `incidents:read:all` ou `incidents:read:own` | com `read:own`, exige participação no incidente |
| `PATCH /api/incidents/:id/status` | `incidents:update:all` | sem regra extra |
| `PATCH /api/incidents/:id/assign` | `incidents:assign:all` | sem regra extra |
| `POST /api/incidents/:id/comments` | `incidents:update:all` ou `incidents:update:own` | com `update:own`, exige participação |

## request-service

| Endpoint | Permissão JWT | Regra adicional de escopo |
|---|---|---|
| `POST /api/service-requests` | `requests:create:all` | sem regra extra |
| `GET /api/service-requests` | `requests:read:all` ou `requests:read:own` | com `read:own`, lista restringe ao solicitante/participante |
| `GET /api/service-requests/:id` | `requests:read:all` ou `requests:read:own` | com `read:own`, exige participação |
| `POST /api/service-requests/:id/submit` | `requests:update:all` ou `requests:update:own` | com `update:own`, exige solicitante |
| `POST /api/service-requests/:id/approve` | `requests:approve:all` | valida papel de aprovador no fluxo |
| `POST /api/service-requests/:id/reject` | `requests:approve:all` | valida papel de aprovador no fluxo |

## problem-change-service

| Endpoint | Permissão JWT | Regra adicional de escopo |
|---|---|---|
| `POST /api/problems` | `problems:create:all` | sem regra extra |
| `GET /api/problems` | `problems:read:all` ou `problems:read:own` | com `read:own`, força filtro `createdById=userId` |
| `GET /api/problems/:id` | `problems:read:all` ou `problems:read:own` | com `read:own`, exige `createdById=userId` |
| `GET /api/problems/:id/versions` | `problems:read:all` ou `problems:read:own` | com `read:own`, exige `createdById=userId` antes de listar versões |
| `GET /api/problems/linked-for-incidents` | `problems:read:all` | agregado por incidentes não aceita `read:own` sem validação de acesso aos incidentes |
| `PATCH /api/problems/:id` | `problems:update:all` | sem regra extra |
| `POST /api/changes` | `changes:create:all` | sem regra extra |
| `GET /api/changes` | `changes:read:all` ou `changes:read:own` | com `read:own`, força filtro `createdById=userId` |
| `GET /api/changes/:id` | `changes:read:all` ou `changes:read:own` | com `read:own`, exige `createdById=userId` |
| `GET /api/changes/:id/versions` | `changes:read:all` ou `changes:read:own` | com `read:own`, exige `createdById=userId` antes de listar versões |
| `PATCH /api/changes/:id` | `changes:update:all` | sem regra extra |

## Cobertura de testes (resumo)

- `incident-service`: integração com cenários `read:own` (403 e 200) já presente.
- `request-service`: integração com cenários `read:own` (403 e 200) já presente.
- `problem-change-service`: ajustes em rota para `read:own` e cenários de integração para `GET /problems/:id`, `GET /changes/:id`, versões e endpoint agregado `linked-for-incidents`.
- Execução registrada: `pnpm --filter problem-change-service test:integration` verde (`42/42`) em 2026-05-27 com `.env` e banco local.
