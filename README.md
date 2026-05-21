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
│   └── nginx.conf           # API Gateway (proxy reverso)
├── scripts/
│   └── ensure-database.ts     # Cria bases Postgres antes do migrate deploy
├── docker-compose.yml       # Postgres, Redis, RabbitMQ, Nginx
└── docs/                    # Documentação
```

Cada serviço segue **hexagonal + DDD**: `domain/`, `application/`, `infrastructure/` onde aplicável.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
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
pnpm docker:up
pnpm db:migrate:deploy
```

`db:migrate:deploy` aplica **todas** as migrações Prisma dos nove serviços com base de dados própria. Para um único serviço:

```bash
pnpm --filter identity-service run prisma:migrate:deploy
```

Novas migrations em desenvolvimento:

```bash
pnpm --filter <nome-do-pacote> exec prisma migrate dev --name <nome>
```

Detalhes e tabela de portas: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

### Serviços em desenvolvimento

Na raiz, **todos** os backend + api-docs + frontend + bff:

```bash
pnpm dev
```

Ou por serviço (exemplos):

```bash
pnpm dev:identity          # http://localhost:3001
pnpm dev:request           # http://localhost:3002
pnpm dev:api-docs          # http://localhost:3003
pnpm dev:incident          # http://localhost:3004
pnpm dev:frontend          # Vite — tipicamente http://localhost:5173
```

**Gateway:** `http://localhost:8080` — prefixos `/identity/`, `/request/`, `/incidents/`, `/problem-change/`, `/sla/`, `/escalation/`, `/notifications/`, `/audit/`, `/reporting/`, `/integration/`, `/api-docs/`. Ver `nginx/nginx.conf`.

## Testes

```bash
pnpm test
pnpm test:integration
```

## Padrões

Ports & Adapters (Hexagonal), Repository, inversão de dependência, DDD (entidade, value object, domain event), use cases, DTOs, mensagens RabbitMQ. O `@pgic/shared` expõe `ErrorResponseDto`, helpers HTTP (`sendError`, `sendValidationError`) e schemas comuns para consistência entre serviços.
