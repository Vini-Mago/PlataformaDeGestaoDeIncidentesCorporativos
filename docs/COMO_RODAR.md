# Como Rodar o Projeto

Este é o fluxo recomendado para subir o PGIC completo em ambiente local.

## Pré-requisitos

- Node.js 18 ou superior
- pnpm 9
- Docker com Docker Compose

## Primeira execução

Na raiz do repositório:

```bash
cp .env.example .env
pnpm install
pnpm dev
```

O comando `pnpm dev` faz o fluxo completo:

- sobe Postgres, Redis, RabbitMQ e Nginx via Docker Compose;
- aplica as migrations Prisma de todos os microsserviços;
- inicia todos os backends;
- inicia o API Docs;
- inicia o frontend;
- inicia o BFF.

Se alguma porta padrão já estiver ocupada, o script escolhe a próxima porta livre e repassa essa porta para os serviços dependentes.

## Acessos principais

Depois que o comando imprimir o resumo de inicialização, use os endereços exibidos no terminal. Por padrão:

```text
Gateway:  http://localhost:${GATEWAY_PORT}
BFF/UI:   http://localhost:${BFF_PORT}
Frontend: http://localhost:5173
API Docs: http://localhost:${API_DOCS_PORT}
```

Para usar a aplicação pelo fluxo mais completo de cookies e proxy, prefira o endereço do BFF/UI.

## Comandos úteis

```bash
pnpm dev
```

Sobe tudo e aplica migrations. É o comando principal.

```bash
pnpm dev:all
pnpm dev:all:migrate
```

Aliases do mesmo fluxo de `pnpm dev`.

```bash
pnpm dev:all:no-migrate
```

Sobe tudo sem reaplicar migrations.

```bash
pnpm exec tsx scripts/dev-all.ts --dry-run
```

Mostra quais portas seriam usadas sem iniciar containers ou serviços.

```bash
pnpm docker:down
```

Para os containers de infraestrutura.

## Rodar um serviço isolado

Os scripts individuais continuam disponíveis:

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
pnpm dev:integration
pnpm dev:api-docs
pnpm dev:frontend
pnpm dev:bff
```

Nesse modo isolado, garanta antes que a infraestrutura esteja de pé:

```bash
pnpm docker:up
```
