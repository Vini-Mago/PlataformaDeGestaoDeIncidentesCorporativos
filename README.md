# PGIC — Plataforma de Gestão de Incidentes Corporativos

Plataforma corporativa em TypeScript com **DDD**, **Arquitetura Hexagonal** e **Microserviços**. Monorepo com núcleo compartilhado (`@pgic/shared`): formato de erro, validação, schemas e infraestrutura HTTP comum.

## Stack

- **TypeScript** (strict)
- **Monorepo** (pnpm workspaces)
- **PostgreSQL** (Prisma)
- **Redis** (cache)
- **RabbitMQ** (eventos entre serviços)
- **Express** (API HTTP)
- **Nginx** (API Gateway em Docker)

## Estrutura do repositório

```
PGIC/
├── packages/
│   ├── shared/             # Núcleo do framework: eventos, DTOs, HTTP helpers, schemas
│   ├── identity-service/   # Microserviço de identidade (auth, usuários)
│   └── request-service/    # Catálogo de serviços e requisições de serviço (RF-6)
├── nginx/
│   └── nginx.conf          # API Gateway (proxy reverso)
├── docker-compose.yml      # Postgres, Redis, RabbitMQ, Nginx
└── docs/                   # Documentação
```

Cada serviço segue **hexagonal + DDD**: `domain/`, `application/`, `infrastructure/`. O guia [docs/STRUCTURE.md](docs/STRUCTURE.md) define onde colocar cada arquivo e como nomear (estilo Laravel).

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão do framework, shared como núcleo, camadas, convenções |
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Árvore de pastas, nomeação, checklist novo recurso / novo serviço |
| [docs/API.md](docs/API.md) | Gateway, endpoints, autenticação, exemplos |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Como rodar, testes, env, troubleshooting |
| [docs/SECURITY.md](docs/SECURITY.md) | Validação, limites, OWASP, boas práticas |
| [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) | Code review consolidado, problemas por severidade, recomendações |
| [docs/TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md) | Revisão técnica do estado atual, paths e itens resolvidos |
| [docs/RESILIENCE.md](docs/RESILIENCE.md) | Timeouts, retries e política de resiliência |

## Como rodar

```bash
cp .env.example .env
pnpm install
pnpm docker:up
```

Migrações (após `pnpm docker:up`; cria o DB se não existir e aplica as migrations):

```bash
pnpm --filter identity-service run prisma:migrate:deploy
pnpm --filter request-service run prisma:migrate:deploy
```

Novas migrations: `pnpm --filter <service> exec prisma migrate dev --name <nome>`.

Serviços (em terminais separados ou `pnpm dev` para subir todos):

```bash
pnpm dev:identity   # http://localhost:3001
pnpm dev:request    # http://localhost:3002
pnpm dev:api-docs   # http://localhost:3003 (Swagger unificado)
# ou: pnpm dev       # identity + request + api-docs
```

Gateway: **http://localhost:8080** (prefixos `/identity/`, `/request/`, `/api-docs/`). Detalhes em [docs/API.md](docs/API.md).

## Testes

```bash
pnpm test
```

Roda Vitest em todos os pacotes (use cases, DTOs, controllers).

## Padrões

Ports & Adapters (Hexagonal), Repository, Inversão de dependência, DDD (entidade, value object, domain event), Use case, DTO, Publish-Subscribe (RabbitMQ). O `@pgic/shared` expõe contrato de erro (`ErrorResponseDto`), helpers HTTP (`sendError`, `sendValidationError`) e schemas comuns (ex.: `nameSchema`) para manter consistência entre serviços.
