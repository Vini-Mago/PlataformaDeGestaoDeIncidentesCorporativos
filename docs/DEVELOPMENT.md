# Desenvolvimento local (PGIC)

Guia prático para subir o ambiente, aplicar migrações e correr testes. Variáveis sensíveis ficam no `.env` na raiz (nunca commitar).

## Pré-requisitos

- **Node.js** ≥ 18 (ver `engines` em `package.json` na raiz)
- **pnpm** 9 (`packageManager` na raiz)
- **Docker** e Docker Compose (Postgres, Redis, RabbitMQ e Nginx)

Opcional: `psql`, `redis-cli`, Make.

## Primeira vez

```bash
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` sobe Docker Compose, aplica `prisma migrate deploy` em todos os pacotes com Prisma e inicia os serviços. Cada serviço usa `scripts/ensure-database.ts` para criar a base se ainda não existir.

## Serviços HTTP e portas (padrão `.env.example`)

| Pacote | Porta local | Prefixo no gateway (`GATEWAY_PORT`) |
|--------|-------------|---------------------------|
| identity-service | 3201 | `/identity/` |
| request-service | 3202 | `/request/` |
| api-docs | 3203 | `/api-docs/` |
| incident-service | 3204 | `/incidents/` |
| problem-change-service | 3205 | `/problem-change/` |
| sla-service | 3206 | `/sla/` |
| escalation-service | 3207 | `/escalation/` |
| notification-service | 3208 | `/notifications/` |
| audit-service | 3209 | `/audit/` |
| reporting-service | 3210 | `/reporting/` |
| bff | 3300 | — (consumido pelo frontend) |
| frontend (Vite) | 5173 | — |

Gateway: `http://localhost:58080` (variável `GATEWAY_PORT`). Health do proxy: `GET /health`.

### Subir aplicações

Na raiz, para subir Docker Compose + migrations + todos os serviços:

```bash
pnpm dev
```

O comando usa `scripts/dev-all.ts`: se uma porta padrão estiver ocupada, ele escolhe a próxima porta livre e atualiza as variáveis usadas por BFF, API Docs, frontend e Nginx naquele processo. `pnpm dev:all` e `pnpm dev:all:migrate` executam o mesmo fluxo.

```bash
pnpm dev:all:no-migrate
```

Use apenas quando quiser iniciar tudo sem reaplicar migrations.

Para apenas conferir quais portas seriam usadas, sem iniciar nada:

```bash
pnpm exec tsx scripts/dev-all.ts --dry-run
```

Ou, por serviço:

```bash
pnpm dev:identity
pnpm dev:request
pnpm dev:incident
pnpm dev:problem-change
pnpm dev:sla
pnpm dev:escalation
pnpm dev:notification-service
pnpm dev:audit-service
pnpm dev:reporting-service
pnpm dev:api-docs
pnpm dev:frontend
pnpm dev:bff
```

### Frontend e BFF

O **BFF** (`pnpm dev:bff`, porta **3300**) repõe o JWT em cookie httpOnly e encaminha pedidos para os microsserviços com cabeçalho `Authorization`. O **frontend** (`pnpm dev:frontend`, **5173**) usa o proxy Vite (`vite.config.ts`) para `/auth`, `/incidents`, etc., até ao BFF.

Para sessão e chamadas à API na mesma política de cookies, prefira aceder à UI através do BFF em **`http://localhost:3300`** (ele faz proxy do frontend em desenvolvimento) ou mantenha **5173** com BFF a correr em paralelo. O dashboard lista incidentes em **`GET /incidents/incidents`** (credenciais incluídas).

## Migrações

O fluxo normal já aplica migrations via `pnpm dev`.

**Todas as bases manualmente:**

```bash
pnpm db:migrate:deploy
```

**Um serviço apenas:**

```bash
pnpm --filter identity-service run prisma:migrate:deploy
```

**Nova migration em desenvolvimento:**

```bash
pnpm --filter <nome-do-pacote> exec prisma migrate dev --name descricao_curta
```

Use o nome do pacote conforme `packages/*/package.json` (`identity-service`, `request-service`, …).

## Testes

```bash
pnpm test
pnpm test:integration
```

## Problemas frequentes

- **Postgres recusa conexão:** no fluxo normal, reinicie `pnpm dev` e confira a porta impressa no terminal. Ao rodar serviços isolados, confirme `pnpm docker:up` e que `POSTGRES_PORT` no `.env` coincide com o mapeamento do Compose.
- **Nginx não alcança os serviços:** no Linux, `docker-compose.yml` usa `extra_hosts: host.docker.internal:host-gateway` para os microsserviços corridos no host com `pnpm dev:*`.
- **`DATABASE_URL` / `*_DATABASE_URL`:** cada serviço Prisma espera a sua URL (ver `.env.example`). O script `ensure-database` usa `DATABASE_URL` temporariamente durante `prisma:migrate:deploy` dentro de cada pacote.

Para contexto de produto e arquitetura, ver [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md), [MICROSERVICES_LIST.md](MICROSERVICES_LIST.md) e o README na raiz.

## Convenções de API (checklist Fase 2)

### Paginação e listagens

Em novos endpoints de listagem, preferir:

- **`limit`** (opcional, inteiro positivo) com tecto por omissão **100** para evitar respostas gigantes.
- **`offset`** (opcional, ≥ 0) para páginas simples; ou **`cursor`** + **`cursorDirection`** quando a lista for grande e estável por chave de ordenação.
- Resposta com metadados opcionais: `total` (quando o custo da contagem for aceitável) ou `hasMore`.

Documentar no OpenAPI do serviço os parâmetros escolhidos.

### Versionamento e deprecação

- **Versão na URL:** prefixo global `/v1/` no gateway (recomendado para PGIC quando formalizado) ou por serviço em `nginx/templates/default.conf.template`.
- **Deprecação:** ao alterar contratos, manter a rota antiga durante um período de convivência (ex.: 2 releases ou 90 dias, o que for maior); responder com cabeçalho **`Deprecation`** (RFC 9745) e **`Sunset`** com data ISO8601 quando aplicável; anunciar no changelog interno e no Swagger (`deprecated: true` nas operações).

Constantes de eventos RabbitMQ para pedidos de serviço: ver `@pgic/shared` (`EXCHANGE_REQUEST_EVENTS`, `REQUEST_*_EVENT`).
