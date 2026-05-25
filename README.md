# PGIC — Plataforma de Gestão de Incidentes Corporativos

Plataforma corporativa em TypeScript com **DDD**, **Arquitetura Hexagonal** e **Microserviços**. Monorepo com núcleo compartilhado (`@pgic/shared`): formato de erro, validação, schemas e infraestrutura HTTP comum.

## Stack

- **TypeScript** (strict)
- **Monorepo** (pnpm workspaces)
- **PostgreSQL** (Prisma; uma base por microsserviço no mesmo servidor Postgres)
- **Redis** (cache / sessão)
- **RabbitMQ** (eventos entre serviços)
- **Express** (API HTTP)
- **Nginx** (API Gateway em Docker)

## Estrutura do repositório

```
PGIC/
├── packages/
│   ├── shared/              # @pgic/shared — DTOs, HTTP, validação, eventos
│   ├── identity-service/    # Identidade, auth, RBAC base
│   ├── request-service/     # Catálogo e requisições de serviço (RF-6)
│   ├── incident-service/    # Incidentes (RF-5)
│   ├── problem-change-service/
│   ├── sla-service/
│   ├── escalation-service/
│   ├── notification-service/
│   ├── audit-service/
│   ├── reporting-service/
│   ├── integration-service/ # Webhooks e integrações externas (RF-9)
│   ├── api-docs/            # Swagger unificado
│   ├── bff/
│   └── frontend/
├── nginx/
│   └── templates/           # API Gateway (proxy reverso com portas via env)
├── scripts/
│   └── ensure-database.ts     # Cria bases Postgres antes do migrate deploy
├── docker-compose.yml       # Postgres, Redis, RabbitMQ, Nginx
└── docs/                    # Documentação
```

Cada serviço segue **hexagonal + DDD**: `domain/`, `application/`, `infrastructure/` onde aplicável.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/COMO_RODAR.md](docs/COMO_RODAR.md) | Passo a passo para rodar o projeto completo localmente |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Ambiente local, migrações, portas, troubleshooting |
| [docs/TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md) | Pacotes, gateway, Prisma, estado técnico atual |
| [docs/RequisitosCorp.md](docs/RequisitosCorp.md) | Requisitos corporativos de referência |
| [docs/AnaliseRequisitos.md](docs/AnaliseRequisitos.md) | Análise de requisitos do domínio PGIC |
| [docs/MICROSERVICES_LIST.md](docs/MICROSERVICES_LIST.md) | Serviços e eventos entre microsserviços |
| [docs/MICROSERVICES.md](docs/MICROSERVICES.md) | Visão de microsserviços |
| [docs/ChecklistCompletoDetalhadoPassoAPasso.md](docs/ChecklistCompletoDetalhadoPassoAPasso.md) | Checklist operacional por fases |
| [docs/ChecklistContextoCorporativoCompleto.md](docs/ChecklistContextoCorporativoCompleto.md) | Contexto corporativo e mapa normativo |

## Como rodar

```bash
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` sobe Docker Compose, aplica as migrations de todos os microsserviços e inicia backend, API Docs, frontend e BFF. Se alguma porta estiver ocupada, ele escolhe outra porta livre e ajusta as conexões automaticamente. Detalhes: [docs/COMO_RODAR.md](docs/COMO_RODAR.md).

### Serviços em desenvolvimento

Na raiz, **Docker + todos** os backend + api-docs + frontend + bff:

```bash
pnpm dev
```

Esse comando escolhe automaticamente outra porta quando a porta padrão estiver ocupada e propaga a nova porta para BFF, Swagger e Nginx. `pnpm dev:all` e `pnpm dev:all:migrate` são aliases do mesmo fluxo.

```bash
pnpm dev:all:no-migrate
```

Use esse comando apenas quando quiser subir sem reaplicar migrations.

Ou por serviço (exemplos):

```bash
pnpm dev:identity          # http://localhost:${IDENTITY_SERVICE_PORT}
pnpm dev:request           # http://localhost:${REQUEST_SERVICE_PORT}
pnpm dev:api-docs          # http://localhost:${API_DOCS_PORT}
pnpm dev:incident          # http://localhost:${INCIDENT_SERVICE_PORT}
pnpm dev:frontend          # Vite — tipicamente http://localhost:5173
```

**Gateway:** `http://localhost:${GATEWAY_PORT}` — prefixos `/identity/`, `/request/`, `/incidents/`, `/problem-change/`, `/sla/`, `/escalation/`, `/notifications/`, `/audit/`, `/reporting/`, `/integration/`, `/api-docs/`. Ver `nginx/templates/default.conf.template`.

## Testes

```bash
pnpm test
pnpm test:integration
```

## Padrões

Ports & Adapters (Hexagonal), Repository, inversão de dependência, DDD (entidade, value object, domain event), use cases, DTOs, mensagens RabbitMQ. O `@pgic/shared` expõe `ErrorResponseDto`, helpers HTTP (`sendError`, `sendValidationError`) e schemas comuns para consistência entre serviços.
